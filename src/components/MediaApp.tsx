import { useState, useEffect, useRef } from 'react';
import { FixedSizeList } from 'react-window';
import axios from 'axios';
import { Media, UploadResponse, DeleteResponse } from '../types/media';
import moment from 'moment';

axios.defaults.withCredentials = true;

interface User {
  id: number;
  username: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  estimatedTime?: string;
}

const MediaApp: React.FC = () => {
  const [media, setMedia] = useState<Media[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [columns, setColumns] = useState(1);
  const [listHeight, setListHeight] = useState(window.innerHeight - 150);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const url = new URL(window.location.href);
  const API_BASE_URL = url.origin;
  //const API_BASE_URL = 'http://localhost:3010';

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
      fetchMedia();
    }
  }, [user]);

  const fetchMedia = async () => {
    try {
      const response = await axios.get<Media[]>(`${API_BASE_URL}/get_media.php`);
      if (Array.isArray(response.data)) {
        setMedia(response.data);
        setSelectedIds([]);
      } else {
        console.error('Expected an array, got:', response.data);
        setMedia([]);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách media:', error);
      setMedia([]);
      setSelectedIds([]);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      alert('Vui lòng chọn ít nhất một file!');
      return;
    }

    const initialProgress = Array.from(files).map((file) => ({
      fileName: file.name,
      progress: 0,
      estimatedTime: 'Đang tính...',
    }));
    setUploadProgress(initialProgress);
    setSkippedFiles([]);

    let successCount = 0;
    let errorMessages: string[] = [];
    let skippedMessages: string[] = [];

    for (let file of Array.from(files)) {
      const formData = new FormData();
      formData.append('photo', file);
      const startTime = Date.now();

      try {
        const response = await axios.post<UploadResponse>(`${API_BASE_URL}/upload.php`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              const elapsedTime = (Date.now() - startTime) / 1000; // seconds
              const uploadSpeed = progressEvent.loaded / elapsedTime; // bytes/s
              const remainingBytes = progressEvent.total - progressEvent.loaded;
              const estimatedSeconds = remainingBytes / uploadSpeed;
              const estimatedTime = estimatedSeconds > 60
                ? `${Math.floor(estimatedSeconds / 60)}m ${Math.round(estimatedSeconds % 60)}s`
                : `${Math.round(estimatedSeconds)}s`;

              setUploadProgress((prev) =>
                prev.map((item) =>
                  item.fileName === file.name
                    ? { ...item, progress: percentCompleted, estimatedTime }
                    : item
                )
              );
            }
          },
        });
        if (response.data.success) {
          successCount++;
        } else if (response.data.message === 'Ảnh hoặc video đã tồn tại') {
          skippedMessages.push(`${file.name}: File đã tồn tại`);
        } else {
          errorMessages.push(`Lỗi với ${file.name}: ${response.data.message}`);
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        errorMessages.push(`Lỗi với ${file.name}: Không thể tải file`);
      }
    }

    if (successCount > 0 || skippedMessages.length > 0 || errorMessages.length > 0) {
      let message: string[] = [];
      if (successCount > 0) {
        message.push(`Tải thành công ${successCount} file`);
      }
      if (skippedMessages.length > 0) {
        message.push(`Bỏ qua ${skippedMessages.length} file trùng lặp:\n${skippedMessages.join('\n')}`);
        setSkippedFiles(skippedMessages.map(msg => msg.split(':')[0]));
      }
      if (errorMessages.length > 0) {
        message.push(`Lỗi:\n${errorMessages.join('\n')}`);
      }
      alert(message.join('\n\n'));
    }

    setUploadProgress([]);
    fetchMedia();
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
    if (selectedIds.length === media.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(media.map((item) => item.id));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một file để xóa!');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} file?`)) {
      return;
    }

    try {
      const response = await axios.post<DeleteResponse>(`${API_BASE_URL}/delete.php`, { ids: selectedIds });
      if (response.data.success) {
        alert(response.data.message);
        fetchMedia();
      } else {
        alert(`Lỗi: ${response.data.message}`);
      }
    } catch (error) {
      alert('Lỗi khi xóa file!');
      console.error('Lỗi xóa:', error);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/register.php`, { username, email: loginInput, password });
      if (response.data.success) {
        alert(response.data.message);
        setIsRegistering(false);
        setUsername('');
        setLoginInput('');
        setPassword('');
      } else {
        alert(`Lỗi: ${response.data.message}`);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert('Lỗi khi đăng ký!');
    }
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login.php`, { email: loginInput, password: password });
      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setLoginInput('');
        setPassword('');
      } else {
        alert(`Lỗi: ${response.data.message}`);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert('Lỗi khi đăng nhập!');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/logout.php`);
      if (response.data.success) {
        setUser(null);
        setMedia([]);
        setSelectedIds([]);
        localStorage.removeItem('user');
        alert(response.data.message);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const handleNextMedia = () => {
    if (!selectedMedia) return;
    const currentIndex = media.findIndex((item) => item.id === selectedMedia.id);
    if (currentIndex < media.length - 1) {
      setSelectedMedia(media[currentIndex + 1]);
    }
  };

  const handlePrevMedia = () => {
    if (!selectedMedia) return;
    const currentIndex = media.findIndex((item) => item.id === selectedMedia.id);
    if (currentIndex > 0) {
      setSelectedMedia(media[currentIndex - 1]);
    }
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const mediaInRow = media.slice(index * columns, (index + 1) * columns);

    if (!mediaInRow.length) {
      return null;
    }

    return (
      <div style={style} className="media-grid">
        {mediaInRow.map((item) => (
          <div key={item.id} className={`media-card ${selectedIds.includes(item.id) ? 'selected' : ''}`}>
            <input
              type="checkbox"
              className="media-checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => handleSelect(item.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="media-preview">
              <img
                src={`${API_BASE_URL}/${item.thumbnail_path}`}
                alt={item.file_name}
                loading="lazy"
                onClick={() => setSelectedMedia(item)}
              />
              {item.media_type === 'video' && (
                <div className="play-icon">▶</div>
              )}
            </div>
            <div className="media-info">
              <span className='filename'>{item.file_name || 'Không có tên'}</span>
              <span className="upload-date">
                {moment(item.uploaded_at).format('DD/MM/YYYY HH:mm')}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container" ref={containerRef}>
      <h1>Quản lý Media</h1>
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
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
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
                type="text"
                placeholder="Username hoặc Email"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
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
                checked={selectedIds.length === media.length && media.length > 0}
                onChange={handleSelectAll}
              />
              Chọn tất cả
            </label>
            <input type="file" id="mediaInput" accept="image/*,video/*" multiple onChange={handleUpload} />
            {selectedIds.length > 0 && (
              <button className="delete-button" onClick={handleDelete}>
                Xóa {selectedIds.length} file
              </button>
            )}
            {uploadProgress.length > 0 && (
              <div className="progress-container">
                {uploadProgress.map((item) => (
                  <div key={item.fileName} className="progress-item">
                    <p>{item.fileName}: {item.progress}% (Thời gian còn lại: {item.estimatedTime})</p>
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
                  <p>File trùng lặp (bỏ qua):</p>
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
          {media.length === 0 ? (
            <p>Không có media để hiển thị.</p>
          ) : (
            <div className="media-list-container">
              <FixedSizeList
                height={listHeight}
                width="100%"
                itemCount={Math.ceil(media.length / columns)}
                itemSize={getItemSize()}
              >
                {Row}
              </FixedSizeList>
            </div>
          )}
          {selectedMedia && (
            <div className="modal" onClick={(e) => e.target === e.currentTarget && setSelectedMedia(null)}>
              <button
                className="modal-nav-button modal-prev-button"
                onClick={handlePrevMedia}
                disabled={media.findIndex((item) => item.id === selectedMedia.id) === 0}
              >
                
              </button>
              {selectedMedia.media_type === 'image' ? (
                <img src={`${API_BASE_URL}/${selectedMedia.file_path}`} alt={selectedMedia.file_name} />
              ) : (
                <video controls autoPlay muted>
                  <source src={`${API_BASE_URL}/${selectedMedia.file_path}`} type={`video/${selectedMedia.file_name.split('.').pop()?.toLowerCase()}`} />
                  Trình duyệt không hỗ trợ video.
                </video>
              )}
              <button
                className="modal-nav-button modal-next-button"
                onClick={handleNextMedia}
                disabled={media.findIndex((item) => item.id === selectedMedia.id) === media.length - 1}
              
                >
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MediaApp;