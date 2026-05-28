const Document = require('../models/Document');

class DocumentService {
  /**
   * Lấy danh sách tài liệu có phân trang và lọc theo danh mục
   * @param {Object} queryParams - page, limit, categoryId
   * @returns {Promise<Object>} Object chứa danh sách items và total
   */
  async findAndCount({ page = 1, limit = 10, categoryId }) {
    const filter = { deletedAt: null };

    // Lọc theo danh mục nếu được cung cấp
    if (categoryId && categoryId !== 'all') {
      filter.categoryId = categoryId;
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
      return docObj;
    });

    return {
      items: itemsMapped,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
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
