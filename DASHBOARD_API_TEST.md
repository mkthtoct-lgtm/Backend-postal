# Dashboard API - Test Curl Commands

## 1. Đăng nhập để lấy Access Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng nhập hệ thống thành công.",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "abc123...",
    "user": {
      "id": "60d5ec49c1234567890abcde",
      "fullName": "Nguyễn Thị Admin",
      "email": "admin@example.com",
      "roleId": "69fc5af582ef85451120772a",
      "departmentId": null,
      "status": "active"
    }
  }
}
```

## 2. Lấy Dashboard tự động theo role
```bash
# Lưu access_token từ bước 1
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3000/api/v1/dashboard \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Response:** Dashboard tự động chọn dựa trên role

## 3. Lấy Dashboard Ban Giám Đốc (Tổng quan)
```bash
curl -X GET http://localhost:3000/api/v1/dashboard/board-of-directors \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Dữ liệu trả về:**
- Tổng số user, phòng ban, tài liệu
- Top 5 phòng ban theo số nhân sự
- 10 tài liệu mới nhất
- 10 hoạt động gần đây

## 4. Lấy Dashboard Trưởng bộ phận
```bash
# Yêu cầu: Người dùng phải có departmentId

curl -X GET http://localhost:3000/api/v1/dashboard/department-head \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Dữ liệu trả về:**
- Thông tin phòng ban
- Thống kê nhân sự
- Danh sách nhân sự
- Tài liệu của phòng ban
- Hoạt động của phòng ban

## 5. Lấy Dashboard cá nhân (Nhân sự)
```bash
curl -X GET http://localhost:3000/api/v1/dashboard/employee \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Dữ liệu trả về:**
- Thông tin cá nhân
- Phòng ban, vai trò
- Tài liệu được phân công
- Hoạt động cá nhân

## Lưu ý
- Thay `$ACCESS_TOKEN` bằng token thực tế
- Nếu chạy trên Windows PowerShell:
  ```powershell
  $headers = @{
    "Authorization" = "Bearer $ACCESS_TOKEN"
  }
  Invoke-RestMethod -Uri http://localhost:3000/api/v1/dashboard -Headers $headers
  ```

## Swagger UI
Truy cập: http://localhost:3000/api/docs để xem tất cả API endpoints
