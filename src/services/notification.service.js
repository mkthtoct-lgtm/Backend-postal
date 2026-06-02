const Notification = require('../models/Notification');
const Role = require('../models/Role');

const getFrontendSlug = (backendSlug) => {
  if (backendSlug === 'board_of_directors') return 'bangiamdoc';
  return backendSlug;
};

const getUserGroupIds = (roleSlug) => {
  const feSlug = getFrontendSlug(roleSlug);
  const groups = ['all'];

  if (['admin', 'bangiamdoc', 'truongbophan', 'nhansu', 'user', 'staff'].includes(feSlug)) {
    groups.push('internal');
  }

  if (['daily', 'congtacvien'].includes(feSlug)) {
    groups.push('partner');
  }

  if (['admin', 'bangiamdoc', 'truongbophan'].includes(feSlug)) {
    groups.push('manager');
  }

  return groups;
};

class NotificationService {
  async create(data) {
    return await Notification.create(data);
  }

  async findById(id) {
    return await Notification.findById(id).populate('createdBy', 'fullName email avatarUrl');
  }

  async findAllForUser(userId, roleId, departmentId) {
    // 1. Lấy role của user
    const role = await Role.findById(roleId);
    const roleSlug = role ? role.slug : 'user';
    const feRoleSlug = getFrontendSlug(roleSlug);

    // 2. Xác định danh sách groups của user
    const groups = getUserGroupIds(roleSlug);

    // 3. Nếu là Admin, xem được toàn bộ thông báo
    let query = {};
    if (roleSlug !== 'admin') {
      // 4. Nếu không phải Admin, lọc theo Target:
      // - groups trùng bất kỳ
      // - roles trùng bất kỳ
      // - departments trùng bất kỳ
      query = {
        $or: [
          { 'target.groups': { $in: groups } },
          { 'target.roles': feRoleSlug },
        ]
      };

      // Thêm điều kiện phòng ban nếu user có departmentId
      if (departmentId) {
        query.$or.push({ 'target.departments': departmentId.toString() });
      }
    }

    // 5. Query các thông báo sắp xếp mới nhất
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'fullName email avatarUrl');

    // 6. Map thêm thuộc tính isRead và định dạng lại id -> id (thay cho _id) để tương thích FE tốt nhất
    return notifications.map(notification => {
      const isRead = notification.readBy.some(r => r.userId.toString() === userId.toString());
      const notificationObj = notification.toObject();
      notificationObj.id = notificationObj._id.toString();
      notificationObj.isRead = isRead;
      return notificationObj;
    });
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) return null;

    // Tránh bị push trùng bằng cách kiểm tra trước hoặc dùng addToSet
    const alreadyRead = notification.readBy.some(r => r.userId.toString() === userId.toString());
    if (!alreadyRead) {
      notification.readBy.push({ userId, readAt: new Date() });
      await notification.save();
    }
    
    const populated = await Notification.findById(notificationId).populate('createdBy', 'fullName email avatarUrl');
    const obj = populated.toObject();
    obj.id = obj._id.toString();
    obj.isRead = true;
    return obj;
  }

  async markAsUnread(notificationId, userId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) return null;

    notification.readBy = notification.readBy.filter(r => r.userId.toString() !== userId.toString());
    await notification.save();

    const populated = await Notification.findById(notificationId).populate('createdBy', 'fullName email avatarUrl');
    const obj = populated.toObject();
    obj.id = obj._id.toString();
    obj.isRead = false;
    return obj;
  }

  async markAllAsRead(userId, roleId, departmentId) {
    // Lấy tất cả thông báo hiển thị cho user này
    const notifications = await this.findAllForUser(userId, roleId, departmentId);
    
    // Lọc ra các thông báo chưa đọc
    const unreadIds = notifications
      .filter(n => !n.isRead)
      .map(n => n._id);

    if (unreadIds.length > 0) {
      for (const notificationId of unreadIds) {
        await Notification.findByIdAndUpdate(
          notificationId,
          {
            $addToSet: {
              readBy: { userId, readAt: new Date() }
            }
          }
        );
      }
    }

    return { count: unreadIds.length };
  }
}

module.exports = new NotificationService();
