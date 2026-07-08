const Document = require('../models/Document');

/**
 * Phân nhóm người dùng dựa trên vai trò để kiểm duyệt quyền tài liệu (quy chuẩn tương thích Frontend)
 * @param {string} roleSlug - Slug của vai trò người dùng (e.g. 'admin', 'board_of_directors', 'truongbophan')
 * @returns {string[]} Danh sách các nhóm của người dùng
 */
const getUserGroupIds = (roleSlug) => {
  const groups = ['all'];
  const normRole = roleSlug === 'board_of_directors' ? 'bangiamdoc' : roleSlug;

  if (['admin', 'bangiamdoc', 'board_of_directors', 'truongbophan', 'nhansu', 'user', 'staff'].includes(normRole)) {
    groups.push('internal');
  }

  if (['daily', 'congtacvien'].includes(normRole)) {
    groups.push('partner');
  }

  if (['admin', 'bangiamdoc', 'board_of_directors', 'truongbophan'].includes(normRole)) {
    groups.push('manager');
  }

  return groups;
};

const canUseDocumentAction = ({ roleSlug, rolePermissions = [], departmentId, document, action }) => {
  if (roleSlug === 'admin') return true;
  if (Array.isArray(rolePermissions) && (rolePermissions.includes('*') || rolePermissions.includes('documents:write'))) {
    return true;
  }

  const rule = document.permissions?.[action] || { groups: [], roles: [], departments: [] };
  const userGroups = getUserGroupIds(roleSlug);

  return (
    (Array.isArray(rule.groups) && rule.groups.some(group => userGroups.includes(group))) ||
    (Array.isArray(rule.roles) && rule.roles.includes(roleSlug)) ||
    Boolean(departmentId && Array.isArray(rule.departments) && rule.departments.includes(departmentId.toString()))
  );
};

class DocumentService {
  /**
   * Lấy danh sách tài liệu có phân trang và lọc theo danh mục & phân quyền người dùng
   * @param {Object} queryParams - page, limit, categoryId, roleSlug, rolePermissions, departmentId, filterDepartmentId
   * @returns {Promise<Object>} Object chứa danh sách items và total
   */
  async findAndCount({ page = 1, limit = 10, categoryId, roleSlug, rolePermissions = [], departmentId, filterDepartmentId }) {
    const filter = { deletedAt: null };

    // Lọc theo danh mục nếu được cung cấp
    if (categoryId && categoryId !== 'all') {
      filter.categoryId = categoryId;
    }

    if (filterDepartmentId && filterDepartmentId !== 'all') {
      filter.departmentId = filterDepartmentId;
    }

    // Áp dụng phân quyền dòng (Row-level permissions)
    const hasRoleReadPermission =
      Array.isArray(rolePermissions) &&
      (rolePermissions.includes('*') || rolePermissions.includes('documents:read'));

    if (roleSlug && roleSlug !== 'admin' && !hasRoleReadPermission) {
      const userGroups = getUserGroupIds(roleSlug);
      const orConditions = [
        { 'permissions.view.groups': { $in: userGroups } },
        { 'permissions.view.roles': roleSlug }
      ];

      if (departmentId) {
        orConditions.push({ 'permissions.view.departments': departmentId.toString() });
      }

      filter.$and = [
        ...(filter.$and || []),
        { $or: orConditions }
      ];
    }

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('categoryId') // Populate thông tin danh mục từ DocumentCategory
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Document.countDocuments(filter),
    ]);

    // Format dữ liệu để đảm bảo tương thích 100% với FE:
    // Gán đồng thời cả 'categoryId' dạng string và đối tượng 'category' đầy đủ.
    const canUpload = Array.isArray(rolePermissions) &&
      (rolePermissions.includes('*') || rolePermissions.includes('documents:write'));

    const itemsMapped = documents.map(doc => {
      const docObj = doc.toObject();
      if (docObj.categoryId) {
        if (typeof docObj.categoryId === 'object' && docObj.categoryId._id) {
          docObj.category = docObj.categoryId; // Gán đối tượng danh mục
          docObj.categoryId = docObj.categoryId._id.toString(); // Chuyển categoryId về dạng chuỗi ID
        } else {
          docObj.categoryId = docObj.categoryId.toString();
        }
      }
      const canEdit = canUseDocumentAction({
        roleSlug,
        rolePermissions,
        departmentId,
        document: docObj,
        action: 'edit',
      });

      docObj.capabilities = {
        canUpload,
        canEdit,
        canDelete: canEdit,
        canDownload: true,
      };
      docObj.canEdit = canEdit;
      docObj.canDelete = canEdit;
      docObj.canUpload = canUpload;

      return docObj;
    });

    return {
      items: itemsMapped,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      capabilities: {
        canUpload,
      },
    };
  }

  /**
   * Lấy chi tiết tài liệu theo ID
   * @param {string} id - ID của tài liệu
   * @returns {Promise<Object|null>} Chi tiết tài liệu
   */
  async findById(id) {
    const document = await Document.findOne({ _id: id, deletedAt: null }).populate('categoryId');
    if (!document) return null;

    const docObj = document.toObject();
    if (docObj.categoryId) {
      if (typeof docObj.categoryId === 'object' && docObj.categoryId._id) {
        docObj.category = docObj.categoryId;
        docObj.categoryId = docObj.categoryId._id.toString();
      } else {
        docObj.categoryId = docObj.categoryId.toString();
      }
    }
    return docObj;
  }

  /**
   * Tạo tài liệu mới trong DB
   * @param {Object} data - Dữ liệu tài liệu mới
   * @returns {Promise<Object>} Tài liệu vừa tạo và populate đầy đủ
   */
  async create(data) {
    const newDoc = new Document({
      title: data.title,
      categoryId: data.categoryId,
      departmentId: data.departmentId || null,
      schoolId: data.schoolId || null,
      productId: data.productId || null,
      fileUrl: data.fileUrl || '',
      fileType: data.fileType || '',
      isAiTrainingSource: data.isAiTrainingSource || false,
      uploadedById: data.uploadedById || null,
      status: data.status || 'active',
      permissions: data.permissions || undefined,
    });

    const saved = await newDoc.save();
    return await this.findById(saved._id);
  }

  /**
   * Cập nhật thông tin tài liệu (metadata, status, permissions)
   * @param {string} id - ID tài liệu cần cập nhật
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Promise<Object|null>} Tài liệu sau cập nhật
   */
  async update(id, updateData) {
    const dataToUpdate = { ...updateData };

    const updated = await Document.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: dataToUpdate },
      { returnDocument: 'after' }
    ).populate('categoryId');

    if (!updated) return null;

    const docObj = updated.toObject();
    if (docObj.categoryId) {
      if (typeof docObj.categoryId === 'object' && docObj.categoryId._id) {
        docObj.category = docObj.categoryId;
        docObj.categoryId = docObj.categoryId._id.toString();
      } else {
        docObj.categoryId = docObj.categoryId.toString();
      }
    }
    return docObj;
  }

  /**
   * Xóa mềm tài liệu
   * @param {string} id - ID tài liệu
   * @returns {Promise<Object|null>}
   */
  async softDelete(id) {
    return await Document.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        $set: {
          deletedAt: new Date(),
          status: 'inactive',
        },
      },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new DocumentService();
