import { useState, useEffect, useRef } from 'react';
import { FixedSizeList } from 'react-window';
import axios from 'axios';
import { Photo, UploadResponse, DeleteResponse } from '../types/photo';
import moment from 'moment';

axios.defaults.withCredentials = true;

interface User {
  id: number;
  username: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const url = new URL(window.location.href);
  const API_BASE_URL = url.origin;

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/check_login.php`);
        if (response.data.success) {
          const userData = { id: response.data.user.id, username: response.data.user.username };
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Lỗi kiểm tra đăng nhập:', error);
        setUser(null);
        localStorage.removeItem('user');
      }
    };
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
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

    const initialProgress = Array.from(files).map((file) => ({
      fileName: file.name,
      progress: 0,
    }));
    setUploadProgress(initialProgress);
    setSkippedFiles([]);

    let successCount = 0;
    let errorMessages: string[] = [];
    let skippedMessages: string[] = [];

    for (let file of Array.from(files)) {
      const formData = new FormData();
      formData.append('photo', file);

      try {
        const response = await axios.post<UploadResponse>(`${API_BASE_URL}/upload.php`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress((prev) =>
                prev.map((item) =>
                  item.fileName === file.name ? { ...item, progress: percentCompleted } : item
                )
              );
            }
          },
        });
        if (response.data.success) {
          successCount++;
        } else if (response.data.message === 'Ảnh đã tồn tại') {
          skippedMessages.push(`${file.name}: Ảnh đã tồn tại`);
        } else {
          errorMessages.push(`Lỗi với ${file.name}: ${response.data.message}`);
        }
      } catch (error) {
        errorMessages.push(`Lỗi với ${file.name}: Không thể tải ảnh`);
      }
    }

    if (successCount > 0 || skippedMessages.length > 0 || errorMessages.length > 0) {
      let message = [];
      if (successCount > 0) {
        message.push(`Tải thành công ${successCount} ảnh`);
      }
      if (skippedMessages.length > 0) {
        message.push(`Bỏ qua ${skippedMessages.length} ảnh trùng lặp:\n${skippedMessages.join('\n')}`);
        setSkippedFiles(skippedMessages.map(msg => msg.split(':')[0]));
      }
      if (errorMessages.length > 0) {
        message.push(`Lỗi:\n${errorMessages.join('\n')}`);
      }
      alert(message.join('\n\n'));
    }

    setUploadProgress([]);
    fetchPhotos();
    event.target.value = '';
  };

  const handleClearSkippedFiles = () => {
    setSkippedFiles([]);
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
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
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
        localStorage.removeItem('user');
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

  const handleNextPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((photo) => photo.id === selectedPhoto.id);
    if (currentIndex < photos.length - 1) {
      setSelectedPhoto(photos[currentIndex + 1]);
    }
  };

  const handlePrevPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((photo) => photo.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(photos[currentIndex - 1]);
    }
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
            {uploadProgress.length > 0 && (
              <div className="progress-container">
                {uploadProgress.map((item) => (
                  <div key={item.fileName} className="progress-item">
                    <p>{item.fileName}: {item.progress}%</p>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {skippedFiles.length > 0 && (
              <div className="skipped-files">
                <div className="skipped-files-header">
                  <p>Ảnh trùng lặp (bỏ qua):</p>
                  <button className="clear-skipped-button" onClick={handleClearSkippedFiles}>
                    Ẩn
                  </button>
                </div>
                <ul>
                  {skippedFiles.map((fileName, index) => (
                    <li key={index}>{fileName}</li>
                  ))}
                </ul>
              </div>
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
              <button
                className="modal-nav-button modal-prev-button"
                onClick={handlePrevPhoto}
                disabled={photos.findIndex((photo) => photo.id === selectedPhoto.id) === 0}
              >
                &lt;
              </button>
              <img src={`${API_BASE_URL}/${selectedPhoto.file_path}`} alt={selectedPhoto.file_name} />
              <button
                className="modal-nav-button modal-next-button"
                onClick={handleNextPhoto}
                disabled={photos.findIndex((photo) => photo.id === selectedPhoto.id) === photos.length - 1}
              >
                &gt;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PhotoApp;