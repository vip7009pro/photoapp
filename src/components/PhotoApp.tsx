import { useState, useEffect, useRef } from 'react';
import { FixedSizeList } from 'react-window';
import axios from 'axios';
import { Photo, UploadResponse, DeleteResponse } from '../types/photo';
import moment from 'moment';

interface User {
  id: number;
  username: string;
}

const PhotoApp: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [columns, setColumns] = useState(1);
  const [listHeight, setListHeight] = useState(window.innerHeight - 150);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const url = new URL(window.location.href);
  const API_BASE_URL = url.origin;
/*   const API_BASE_URL = 'http://localhost:3010'; */

  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập khi tải trang
    const checkLogin = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/check_login.php`);
        if (response.data.success) {
          setUser({ id: response.data.user.id, username: response.data.user.username });
        }
      } catch (error) {
        console.log('Chưa đăng nhập');
      }
    };
    checkLogin();
  }, []);

  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      const containerPadding = width < 640 ? 8 : 16;
      const gap = width < 640 ? 12 : 20;
      const minColumnWidth = 200;

      const columnsCount = Math.min(
        Math.max(Math.floor((width - containerPadding) / (minColumnWidth + gap)), 1),
        10
      );
      setColumns(columnsCount);
      setListHeight(window.innerHeight - 150);
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateLayout);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchPhotos();
    }
  }, [user]);

  const fetchPhotos = async () => {
    try {
      const response = await axios.get<Photo[]>(`${API_BASE_URL}/get_photos.php`);
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

  const handleRegister = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/register.php`, { username, email, password });
      if (response.data.success) {
        alert(response.data.message);
        setIsRegistering(false);
        setUsername('');
        setEmail('');
        setPassword('');
      } else {
        alert(`Lỗi: ${response.data.message}`);
      }
    } catch (error) {
      alert('Lỗi khi đăng ký!');
    }
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login.php`, { email, password });
      if (response.data.success) {
        setUser(response.data.user);
        setEmail('');
        setPassword('');
      } else {
        alert(`Lỗi: ${response.data.message}`);
      }
    } catch (error) {
      alert('Lỗi khi đăng nhập!');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/logout.php`);
      if (response.data.success) {
        setUser(null);
        setPhotos([]);
        setSelectedIds([]);
        alert(response.data.message);
      }
    } catch (error) {
      alert('Lỗi khi đăng xuất!');
    }
  };

  const getItemSize = () => {
    const width = containerRef.current?.offsetWidth || window.innerWidth;
    const containerPadding = width < 640 ? 8 : 16;
    const gap = width < 640 ? 12 : 20;
    const columnsCount = columns;

    const columnWidth = (width - containerPadding - gap * (columnsCount - 1)) / columnsCount;
    const imageHeight = columnWidth * (3 / 4);
    const infoHeight = (width < 640 ? 36 : 40) + (width < 640 ? 10 : 12) * 2;
    const marginBottom = width < 640 ? 20 : 32;

    return imageHeight + infoHeight + marginBottom + 40;
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
              <span className='filename'>{photo.file_name || 'Không có tên'}</span>
              <span className="upload-date">
                {moment(photo.uploaded_at).format('DD/MM/YYYY HH:mm')}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container" ref={containerRef}>
      <h1>Quản lý ảnh</h1>
      {!user ? (
        <div className="auth-section">
          {isRegistering ? (
            <>
              <h2>Đăng ký</h2>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={handleRegister}>Đăng ký</button>
              <button onClick={() => setIsRegistering(false)}>Quay lại đăng nhập</button>
            </>
          ) : (
            <>
              <h2>Đăng nhập</h2>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={handleLogin}>Đăng nhập</button>
              <button onClick={() => setIsRegistering(true)}>Đăng ký tài khoản</button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="user-section">
            <p>Xin chào, {user.username}!</p>
            <button onClick={handleLogout}>Đăng xuất</button>
          </div>
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
        </>
      )}
    </div>
  );
};

export default PhotoApp;