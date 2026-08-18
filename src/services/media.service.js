const Media = require('../models/Media');

class MediaService {
  /**
   * Che giấu tên khách hàng (VD: "Nguyễn Văn A" -> "Nguyễn V*** A")
   */
  maskCustomerName(name) {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length <= 1) return name; // Nếu chỉ có 1 từ thì không che
    
    // Giữ nguyên họ (từ đầu tiên) và tên (từ cuối cùng), che phần đệm
    const first = parts[0];
    const last = parts[parts.length - 1];
    
    if (parts.length === 2) {
      // "Nguyễn A" -> "Nguy*** A"
      return `${first.substring(0, Math.max(1, Math.floor(first.length / 2)))}*** ${last}`;
    }
    
    // Từ 3 từ trở lên: "Nguyễn Văn A" -> "Nguyễn V*** A"
    const middlePart = parts[1];
    const maskedMiddle = middlePart.charAt(0) + '***';
    
    return `${first} ${maskedMiddle} ${last}`;
  }

  /**
   * Lấy danh sách Media có phân trang và lọc
   */
  async findMedias(query = {}, canWrite = false) {
    const { 
      search, category, country, 
      storageProvider, storageOwnership, sourceType, 
      videoType, videoPurpose, documentType, 
      visa_result_status, createdFrom, createdTo,
      page = 1, limit = 10 
    } = query;
    
    const filter = {};
    
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    if (category && category !== 'all' && category !== 'All') {
      filter.category = category;
    }
    if (country && country !== 'All') {
      filter.country_tag = country;
    }
    if (storageProvider && storageProvider !== 'All') {
      filter.storageProvider = storageProvider;
    }
    if (storageOwnership && storageOwnership !== 'All') {
      filter.storageOwnership = storageOwnership;
    }
    if (sourceType && sourceType !== 'All') {
      filter.sourceType = sourceType;
    }
    if (videoType && videoType !== 'All') {
      filter.videoType = videoType;
    }
    if (videoPurpose && videoPurpose !== 'All') {
      filter.videoPurpose = videoPurpose;
    }
    if (documentType && documentType !== 'All') {
      filter.documentType = documentType;
    }
    if (visa_result_status && visa_result_status !== 'All') {
      filter.visa_result_status = visa_result_status;
    }
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo) {
        const toDate = new Date(createdTo);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitParsed = parseInt(limit, 10);

    const [medias, total] = await Promise.all([
      Media.find(filter)
        .sort({ approval_date: -1 })
        .skip(skip)
        .limit(limitParsed)
        .lean(),
      Media.countDocuments(filter)
    ]);

    // Format lại dữ liệu: che tên customer_name và ẩn tên thật nếu không có quyền
    const formattedMedias = medias.map(media => {
      const maskedName = this.maskCustomerName(media.customer_name);
      return {
        ...media,
        customer_name_masked: maskedName,
        customer_name: canWrite ? media.customer_name : ''
      };
    });

    return {
      medias: formattedMedias,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: limitParsed,
        totalPages: Math.ceil(total / limitParsed)
      }
    };
  }

  /**
   * Lấy chi tiết một media
   */
  async findById(id, canWrite = false) {
    const media = await Media.findById(id).lean();
    if (media) {
      media.customer_name_masked = this.maskCustomerName(media.customer_name);
      if (!canWrite) {
        media.customer_name = '';
      }
    }
    return media;
  }

  /**
   * Thêm mới media
   */
  async createMedia(data) {
    const newMedia = new Media(data);
    return await newMedia.save();
  }

  /**
   * Cập nhật media
   */
  async updateMedia(id, data) {
    return await Media.findByIdAndUpdate(id, data, { new: true });
  }

  /**
   * Xóa media
   */
  async deleteMedia(id) {
    return await Media.findByIdAndDelete(id);
  }
}

module.exports = new MediaService();
