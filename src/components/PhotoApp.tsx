import { useState, useEffect } from 'react';
import { FixedSizeList } from 'react-window';
import axios from 'axios';
import { Photo, UploadResponse, DeleteResponse } from '../types/photo';

const PhotoApp: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [columns, setColumns] = useState(1);
  const [listHeight, setListHeight] = useState(window.innerHeight - 150);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const API_BASE_URL = 'http://localhost/photo-app';

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const containerPadding = width < 640 ? 8 : 16; // 4px * 2 mobile, 8px * 2 desktop
      const gap = width < 640 ? 12 : 20;
      const minColumnWidth = 200; // Chiều rộng tối thiểu mỗi cột
      // Tính số cột động, giới hạn tối đa 10 cột
      const columnsCount = Math.min(
        Math.max(Math.floor((width - containerPadding) / (minColumnWidth + gap)), 1),
        10
      );
      setColumns(columnsCount);
      setListHeight(window.innerHeight - 150);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const response = await axios.get<Photo[]>(`${API_BASE_URL}/get_photos.php`);
      console.log('API Response:', response.data);
      if (Array.isArray(response.data)) {
        setPhotos(response.data);
        setSelectedIds([]);
      } else {
        console.error('Expected an array, got:', response.data);
        setPhotos([]);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách ảnh:', error);
      setPhotos([]);
      setSelectedIds([]);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      alert('Vui lòng chọn ít nhất một ảnh!');
      return;
    }

    let successCount = 0;
    let errorMessages: string[] = [];

    for (let file of Array.from(files)) {
      const formData = new FormData();
      formData.append('photo', file);

      try {
        const response = await axios.post<UploadResponse>(`${API_BASE_URL}/upload.php`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.data.success) {
          successCount++;
        } else {
          errorMessages.push(`Lỗi với ${file.name}: ${response.data.message}`);
        }
      } catch (error) {
        errorMessages.push(`Lỗi với ${file.name}: Không thể tải ảnh`);
      }
    }

    if (successCount === files.length) {
      alert(`Tải thành công ${successCount} ảnh!`);
    } else {
      alert(`Tải thành công ${successCount} ảnh. Lỗi:\n${errorMessages.join('\n')}`);
    }

    fetchPhotos();
    event.target.value = '';
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === photos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.map((photo) => photo.id));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một ảnh để xóa!');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} ảnh?`)) {
      return;
    }

    try {
      const response = await axios.post<DeleteResponse>(`${API_BASE_URL}/delete.php`, { ids: selectedIds });
      if (response.data.success) {
        alert(response.data.message);
        fetchPhotos();
      } else {
        alert(`Lỗi: ${response.data.message}`);
      }
    } catch (error) {
      alert('Lỗi khi xóa ảnh!');
      console.error('Lỗi xóa:', error);
    }
  };

  const getItemSize = () => {
    const width = window.innerWidth;
    const containerPadding = width < 640 ? 8 : 16; // padding container
    const gap = width < 640 ? 12 : 20; // gap trong photo-grid
    const columnsCount = columns; // Sử dụng state columns
    
    // Tính chiều rộng mỗi cột
    const columnWidth = (width - containerPadding - gap * (columnsCount - 1)) / columnsCount;
    const imageHeight = columnWidth * (3 / 4); // aspect-ratio 4/3
    const infoHeight = (width < 640 ? 36 : 40) + (width < 640 ? 10 : 12) * 2; // min-height + padding
    const marginBottom = width < 640 ? 16 : 24; // margin-bottom của photo-grid
    
    return imageHeight + infoHeight + marginBottom + 20; // Buffer tăng lên 20px
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const photosInRow = photos.slice(index * columns, (index + 1) * columns);

    if (!photosInRow.length) {
      return null;
    }

    return (
      <div style={style} className="photo-grid">
        {photosInRow.map((photo) => (
          <div key={photo.id} className={`photo-card ${selectedIds.includes(photo.id) ? 'selected' : ''}`}>
            <input
              type="checkbox"
              className="photo-checkbox"
              checked={selectedIds.includes(photo.id)}
              onChange={() => handleSelect(photo.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <img
              src={`${API_BASE_URL}/${photo.thumbnail_path}`}
              alt={photo.file_name}
              loading="lazy"
              onClick={() => setSelectedPhoto(photo)}
            />
            <div className="photo-info">
              <p>{photo.file_name || 'Không có tên'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container">
      <h1>Quản lý ảnh</h1>
      <div className="upload-section">
        <label className="select-all">
          <input
            type="checkbox"
            checked={selectedIds.length === photos.length && photos.length > 0}
            onChange={handleSelectAll}
          />
          Chọn tất cả
        </label>
        <input type="file" id="photoInput" accept="image/*" multiple onChange={handleUpload} />
        {selectedIds.length > 0 && (
          <button className="delete-button" onClick={handleDelete}>
            Xóa {selectedIds.length} ảnh
          </button>
        )}
      </div>
      {photos.length === 0 ? (
        <p>Không có ảnh để hiển thị.</p>
      ) : (
        <div className="photo-list-container">
          <FixedSizeList
            height={listHeight}
            width="100%"
            itemCount={Math.ceil(photos.length / columns)}
            itemSize={getItemSize()}
          >
            {Row}
          </FixedSizeList>
        </div>
      )}
      {selectedPhoto && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setSelectedPhoto(null)}>
          <img src={`${API_BASE_URL}/${selectedPhoto.file_path}`} alt={selectedPhoto.file_name} />
        </div>
      )}
    </div>
  );
};

export default PhotoApp;