const JobDescription = require('../models/JobDescription');

class JobDescriptionService {
  /**
   * Lấy danh sách JD có phân trang và bộ lọc
   */
  async findAndCount({ page = 1, limit = 10, search = '', departmentId, status }) {
    const filter = {};

    // Lọc theo từ khóa tìm kiếm trong tiêu đề hoặc mô tả công việc
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // Lọc theo phòng ban
    if (departmentId) {
      filter.departmentId = departmentId;
    }

    // Lọc theo trạng thái hoạt động (active, inactive, draft)
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      JobDescription.find(filter)
        .populate('departmentId', 'name')
        .populate('createdBy', 'fullName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      JobDescription.countDocuments(filter),
    ]);

    // Chuẩn hóa định dạng id cho FE
    const itemsMapped = items.map(item => {
      const obj = item.toObject();
      obj.id = obj._id.toString();
      if (obj.departmentId && obj.departmentId._id) {
        obj.department = obj.departmentId;
        obj.departmentId = obj.departmentId._id.toString();
      }
      if (obj.createdBy && obj.createdBy._id) {
        obj.creator = obj.createdBy;
        obj.createdBy = obj.createdBy._id.toString();
      }
      return obj;
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
   * Xem chi tiết một JD theo ID
   */
  async findById(id) {
    const item = await JobDescription.findById(id)
      .populate('departmentId', 'name')
      .populate('createdBy', 'fullName email');

    if (!item) return null;

    const obj = item.toObject();
    obj.id = obj._id.toString();
    if (obj.departmentId && obj.departmentId._id) {
      obj.department = obj.departmentId;
      obj.departmentId = obj.departmentId._id.toString();
    }
    if (obj.createdBy && obj.createdBy._id) {
      obj.creator = obj.createdBy;
      obj.createdBy = obj.createdBy._id.toString();
    }
    return obj;
  }

  /**
   * Tạo JD công việc mới
   */
  async create(data) {
    const newItem = new JobDescription({
      title: data.title,
      departmentId: data.departmentId,
      description: data.description,
      requirements: data.requirements || '',
      benefits: data.benefits || '',
      salaryRange: {
        min: data.salaryRange?.min !== undefined ? data.salaryRange.min : null,
        max: data.salaryRange?.max !== undefined ? data.salaryRange.max : null,
        currency: data.salaryRange?.currency || 'VND',
      },
      workingType: data.workingType || 'full-time',
      location: data.location || '',
      status: data.status || 'active',
      createdBy: data.createdBy,
    });

    const saved = await newItem.save();
    return await this.findById(saved._id);
  }

  /**
   * Cập nhật thông tin JD
   */
  async update(id, updateData) {
    const dataToUpdate = {};
    if (updateData.title !== undefined) dataToUpdate.title = updateData.title.trim();
    if (updateData.departmentId !== undefined) dataToUpdate.departmentId = updateData.departmentId;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.requirements !== undefined) dataToUpdate.requirements = updateData.requirements;
    if (updateData.benefits !== undefined) dataToUpdate.benefits = updateData.benefits;
    
    if (updateData.salaryRange !== undefined) {
      dataToUpdate.salaryRange = {
        min: updateData.salaryRange?.min !== undefined ? updateData.salaryRange.min : null,
        max: updateData.salaryRange?.max !== undefined ? updateData.salaryRange.max : null,
        currency: updateData.salaryRange?.currency || 'VND',
      };
    }
    
    if (updateData.workingType !== undefined) dataToUpdate.workingType = updateData.workingType;
    if (updateData.location !== undefined) dataToUpdate.location = updateData.location.trim();
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;

    const updated = await JobDescription.findByIdAndUpdate(
      id,
      { $set: dataToUpdate },
      { returnDocument: 'after' }
    );

    if (!updated) return null;
    return await this.findById(updated._id);
  }

  /**
   * Xóa vĩnh viễn JD công việc
   */
  async delete(id) {
    return await JobDescription.findByIdAndDelete(id);
  }
}

module.exports = new JobDescriptionService();
