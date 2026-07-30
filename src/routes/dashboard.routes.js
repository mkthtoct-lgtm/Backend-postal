const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Các API lấy dữ liệu dashboard theo role người dùng.
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Lấy dashboard tùy theo role của người dùng
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Trả dữ liệu dashboard phù hợp với role:
 *       - **Admin/BGĐ**: Dashboard tổng quan toàn hệ thống (tổng số user, phòng ban, tài liệu, top phòng ban, hoạt động gần đây)
 *       - **Trưởng bộ phận**: Dashboard bộ phận (thông tin phòng, nhân sự, tài liệu bộ phận, hoạt động)
 *       - **Nhân sự/Khác**: Dashboard cá nhân (thông tin cá nhân, tài liệu được phân công, hoạt động)
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [board-of-directors, department-head, employee]
 *         description: Loại dashboard admin muốn xem. Nếu không truyền, admin sẽ lấy dashboard Ban Giám Đốc.
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *         description: ID phòng ban khi admin muốn xem dashboard department-head.
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID người dùng khi admin muốn xem dashboard employee.
 *     responses:
 *       200:
 *         description: Lấy dashboard thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       example: board_of_directors
 *                     roleName:
 *                       type: string
 *                     stats:
 *                       type: object
 *                     topDepartments:
 *                       type: array
 *                     recentDocuments:
 *                       type: array
 *                     recentActivities:
 *                       type: array
 *       401:
 *         description: Chưa đăng nhập hoặc token hết hạn
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/', authMiddleware, dashboardController.getDashboard);

/**
 * @swagger
 * /dashboard/board-of-directors:
 *   get:
 *     summary: Lấy dashboard Ban Giám Đốc (tổng quan toàn hệ thống)
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Dashboard cho Ban Giám Đốc/Admin, bao gồm:
 *       - Tổng số user, phòng ban, tài liệu
 *       - Top 5 phòng ban theo số nhân sự
 *       - 10 tài liệu mới nhất
 *       - 10 hoạt động gần đây
 *     responses:
 *       200:
 *         description: Lấy dashboard Ban Giám Đốc thành công
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/board-of-directors', authMiddleware, dashboardController.getBoardOfDirectorsDashboard);

/**
 * @swagger
 * /dashboard/department-head:
 *   get:
 *     summary: Lấy dashboard Trưởng bộ phận
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *         description: ID phòng ban (Admin có thể truyền để xem dashboard bất kỳ phòng nào, không truyền sẽ lấy phòng của người dùng hiện tại)
 *     description: |
 *       Dashboard cho Trưởng bộ phận, bao gồm:
 *       - Thông tin phòng ban
 *       - Thống kê nhân sự (tổng, active, inactive, suspended)
 *       - Danh sách nhân sự
 *       - Tài liệu của phòng ban
 *       - Hoạt động của phòng ban
 *       
 *       **Admin có thể xem dashboard bất kỳ phòng ban nào bằng cách truyền query param**: `?departmentId=xxx`
 *       Hoặc dùng path: `/dashboard/department-head/{departmentId}`
 *     responses:
 *       200:
 *         description: Lấy dashboard Trưởng bộ phận thành công
 *       400:
 *         description: Người dùng không thuộc phòng ban nào hoặc thiếu departmentId
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền xem dashboard phòng ban khác
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/department-head/:departmentId', authMiddleware, dashboardController.getDepartmentHeadDashboard);
router.get('/department-head', authMiddleware, dashboardController.getDepartmentHeadDashboard);

/**
 * @swagger
 * /dashboard/employee:
 *   get:
 *     summary: Lấy dashboard cá nhân (Nhân sự)
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID người dùng (Admin có thể truyền để xem dashboard bất kỳ người dùng nào, không truyền sẽ lấy dashboard của người dùng hiện tại)
 *     description: |
 *       Dashboard cá nhân cho Nhân sự, bao gồm:
 *       - Thông tin cá nhân (tên, email, phòng ban, vai trò)
 *       - Tài liệu được phân công
 *       - Thống kê tài liệu
 *       - Hoạt động cá nhân
 *       
 *       **Admin có thể xem dashboard bất kỳ người dùng nào bằng cách truyền query param**: `?userId=xxx`
 *     responses:
 *       200:
 *         description: Lấy dashboard cá nhân thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền xem dashboard người dùng khác
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/employee', authMiddleware, dashboardController.getEmployeeDashboard);

/**
 * @swagger
 * /dashboard/agent:
 *   get:
 *     summary: Lấy dashboard Đại lý
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID người dùng (Admin có thể truyền để xem dashboard bất kỳ đại lý nào, không truyền sẽ lấy dashboard của đại lý hiện tại)
 *     description: |
 *       Dashboard cá nhân cho Đại lý, bao gồm:
 *       - Thông tin đại lý (tên, email, vai trò)
 *       - Hồ sơ tài liệu giới thiệu từ đại lý
 *       - Thống kê hoạt động hồ sơ đại lý
 *       
 *       **Admin có thể xem dashboard bất kỳ đại lý nào bằng cách truyền query param**: `?userId=xxx`
 *     responses:
 *       200:
 *         description: Lấy dashboard Đại lý thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền xem dashboard đại lý khác
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/agent', authMiddleware, dashboardController.getAgentDashboard);

/**
 * @swagger
 * /dashboard/collaborator:
 *   get:
 *     summary: Lấy dashboard Cộng tác viên
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID người dùng (Admin có thể truyền để xem dashboard bất kỳ cộng tác viên nào, không truyền sẽ lấy dashboard của cộng tác viên hiện tại)
 *     description: |
 *       Dashboard cá nhân cho Cộng tác viên, bao gồm:
 *       - Thông tin cộng tác viên
 *       - Danh sách hồ sơ đã gửi hoặc giới thiệu
 *       - Thống kê tài liệu của CTV
 *       
 *       **Admin có thể xem dashboard bất kỳ cộng tác viên nào bằng cách truyền query param**: `?userId=xxx`
 *     responses:
 *       200:
 *         description: Lấy dashboard Cộng tác viên thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền xem dashboard cộng tác viên khác
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/collaborator', authMiddleware, dashboardController.getCollaboratorDashboard);

/**
 * @swagger
 * /dashboard/user:
 *   get:
 *     summary: Lấy dashboard Khách hàng (User)
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID người dùng (Admin có thể truyền để xem dashboard bất kỳ khách hàng nào, không truyền sẽ lấy dashboard của khách hàng hiện tại)
 *     description: |
 *       Dashboard cá nhân cho Khách hàng (User role), bao gồm:
 *       - Tiến độ hồ sơ du học/định cư cá nhân
 *       - Tài liệu cá nhân đã upload hoặc phê duyệt
 *       
 *       **Lưu ý**: Chỉ tài khoản User được cấp quyền `"dashboard:view"` ở bảng quản trị mới có thể gọi API này thành công.
 *       **Admin có thể xem dashboard bất kỳ khách hàng nào bằng cách truyền query param**: `?userId=xxx`
 *     responses:
 *       200:
 *         description: Lấy dashboard Khách hàng thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Từ chối truy cập do thiếu quyền dashboard:view hoặc không có quyền xem tài khoản khác
 *       500:
 *         description: Lỗi máy chủ
 */
router.get('/user', authMiddleware, dashboardController.getUserDashboard);

module.exports = router;
