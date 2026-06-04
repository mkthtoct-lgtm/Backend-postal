# Dashboard API - Hướng dẫn sử dụng

## 📊 Tổng quan Dashboard API

Dashboard API cung cấp dữ liệu tổng hợp theo từng role của người dùng, giúp Frontend hiển thị giao diện quản lý phù hợp.

### 👥 Dashboard cho từng Role

#### 1. Ban Giám Đốc (BGĐ) / Admin
- **Endpoint:** `GET /api/v1/dashboard/board-of-directors`
- **Hoặc:** `GET /api/v1/dashboard` (tự động chọn nếu role là admin/board_of_directors)
- **Dữ liệu:**
  - 📈 Thống kê tổng: Số user, phòng ban, tài liệu
  - 🏆 Top 5 phòng ban theo số nhân sự
  - 📄 10 tài liệu mới nhất
  - 📋 10 hoạt động gần đây của toàn hệ thống

#### 2. Trưởng bộ phận (Trưởng bộ phận)
- **Endpoint:** `GET /api/v1/dashboard/department-head`
- **Hoặc:** `GET /api/v1/dashboard` (tự động chọn nếu role là truongbophan)
- **Yêu cầu:** Người dùng phải có `departmentId`
- **Dữ liệu:**
  - 🏢 Thông tin phòng ban (tên, mô tả)
  - 👥 Thống kê nhân sự: tổng, active, inactive, suspended
  - 📝 Danh sách nhân sự chi tiết
  - 📊 Thống kê tài liệu: active, draft, pending, inactive
  - 📄 15 tài liệu gần đây của phòng
  - 📋 10 hoạt động của nhân sự trong phòng

#### 3. Nhân sự / Khác
- **Endpoint:** `GET /api/v1/dashboard/employee`
- **Hoặc:** `GET /api/v1/dashboard` (tự động chọn nếu role khác)
- **Dữ liệu:**
  - 👤 Thông tin cá nhân (fullName, email, phone, avatarUrl)
  - 🏢 Phòng ban hiện tại (nếu có)
  - 🔐 Vai trò hiện tại
  - 📊 Thống kê tài liệu được phân công
  - 📄 10 tài liệu được upload
  - 📋 10 hoạt động cá nhân (login, thao tác, etc.)

## 🔌 Cách gọi API

### Bước 1: Đăng nhập để lấy Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password@123"
  }'
```

### Bước 2: Dùng Token gọi Dashboard API
```bash
curl -X GET http://localhost:3000/api/v1/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### JavaScript/Axios
```javascript
// Đăng nhập
const loginRes = await axios.post('/api/v1/auth/login', {
  email: 'user@example.com',
  password: 'Password@123'
});

const accessToken = loginRes.data.data.access_token;

// Lấy dashboard
const dashboardRes = await axios.get('/api/v1/dashboard', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

console.log(dashboardRes.data.data); // Dashboard data
```

## 📋 Cấu trúc Response

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Dashboard Ban Giám Đốc được lấy thành công.",
  "data": {
    "role": "board_of_directors",
    "roleName": "Ban Giám Đốc",
    "stats": { /* thống kê */ },
    "topDepartments": [ /* danh sách */ ],
    "recentDocuments": [ /* danh sách */ ],
    "recentActivities": [ /* danh sách */ ]
  }
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "message": "Lỗi mô tả lỗi xảy ra",
  "error": "Chi tiết lỗi"
}
```

## ⚙️ Điều kiện Truy cập

| Endpoint | Yêu cầu Auth | Điều kiện |
|----------|-------------|---------|
| `/dashboard` | ✅ Bearer Token | Không (tự động chọn theo role) |
| `/dashboard/board-of-directors` | ✅ Bearer Token | Không |
| `/dashboard/department-head` | ✅ Bearer Token | Phải có departmentId |
| `/dashboard/employee` | ✅ Bearer Token | Không |

## 🔍 Ví dụ Response từng Role

### BGĐ/Admin Dashboard Response
```json
{
  "role": "board_of_directors",
  "roleName": "Ban Giám Đốc",
  "stats": {
    "totalUsers": 25,
    "totalDepartments": 5,
    "totalDocuments": 120,
    "totalActiveDocuments": 110
  },
  "topDepartments": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Bộ phận Kỹ thuật",
      "description": "Phòng ban kỹ thuật",
      "memberCount": 12
    }
  ],
  "recentDocuments": [
    {
      "id": "507f1f77bcf86cd799439012",
      "title": "Hướng dẫn sử dụng",
      "status": "active",
      "updatedAt": "2024-06-02T10:30:00Z"
    }
  ],
  "recentActivities": [
    {
      "id": "507f1f77bcf86cd799439013",
      "actor": {
        "id": "507f1f77bcf86cd799439014",
        "fullName": "Nguyễn Văn A",
        "email": "a@example.com"
      },
      "action": "user.create",
      "target": {
        "type": "user",
        "id": "507f1f77bcf86cd799439015",
        "name": "Trần Thị B"
      },
      "createdAt": "2024-06-02T09:30:00Z"
    }
  ]
}
```

### Trưởng bộ phận Dashboard Response
```json
{
  "role": "truongbophan",
  "roleName": "Trưởng bộ phận",
  "department": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Bộ phận Kỹ thuật",
    "description": "Phòng ban kỹ thuật",
    "createdAt": "2024-01-15T00:00:00Z"
  },
  "memberStats": {
    "total": 12,
    "active": 11,
    "inactive": 1,
    "suspended": 0
  },
  "members": [
    {
      "id": "507f1f77bcf86cd799439016",
      "fullName": "Nguyễn Văn C",
      "email": "c@example.com",
      "status": "active"
    }
  ],
  "documentStats": {
    "total": 30,
    "active": 25,
    "draft": 3,
    "pending": 1,
    "inactive": 1
  },
  "recentDocuments": [ /* ... */ ],
  "recentActivities": [ /* ... */ ]
}
```

### Nhân sự Dashboard Response
```json
{
  "role": "nhansu",
  "roleName": "Nhân sự",
  "user": {
    "id": "507f1f77bcf86cd799439017",
    "fullName": "Phạm Thị D",
    "email": "d@example.com",
    "phone": "0912345678",
    "avatarUrl": "https://...",
    "status": "active",
    "department": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Bộ phận Kỹ thuật",
      "description": "Phòng ban kỹ thuật"
    },
    "role": {
      "id": "69fc5af582ef85451120772d",
      "name": "Nhân sự",
      "slug": "nhansu"
    },
    "createdAt": "2024-02-01T00:00:00Z",
    "lastLoginAt": "2024-06-02T08:00:00Z"
  },
  "documentStats": {
    "total": 5,
    "active": 4,
    "draft": 1
  },
  "recentDocuments": [ /* ... */ ],
  "recentActivities": [ /* ... */ ]
}
```

## 🛠️ Troubleshooting

### Lỗi 401: Unauthorized
- **Nguyên nhân:** Token không hợp lệ hoặc hết hạn
- **Giải pháp:** Đăng nhập lại để lấy token mới

### Lỗi 400: Bad Request
- **Nguyên nhân:** Dữ liệu không hợp lệ
- **Giải pháp:** Kiểm tra endpoint và parameters

### Lỗi 500: Server Error
- **Nguyên nhân:** Lỗi hệ thống
- **Giải pháp:** Kiểm tra logs server, liên hệ admin

## 📱 Integration Frontend

### React Example
```javascript
import axios from 'axios';
import { useEffect, useState } from 'react';

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(
          'http://localhost:3000/api/v1/dashboard',
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setDashboard(response.data.data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!dashboard) return <div>Error loading dashboard</div>;

  return (
    <div>
      <h1>{dashboard.roleName} Dashboard</h1>
      {/* Render dashboard based on role */}
      {dashboard.role === 'board_of_directors' && (
        <div>
          <h2>Statistics</h2>
          <p>Users: {dashboard.stats.totalUsers}</p>
          <p>Departments: {dashboard.stats.totalDepartments}</p>
          <p>Documents: {dashboard.stats.totalDocuments}</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
```

## 📞 Support
- API Endpoint: `/api/v1/dashboard`
- API Documentation: `http://localhost:3000/api/docs` (Swagger UI)
- Server: `http://localhost:3000`
