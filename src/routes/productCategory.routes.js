const express = require('express');
const productCategoryController = require('../controllers/productCategory.controller');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Middleware kiểm tra quyền quản lý danh mục sản phẩm
const adminOnlyMiddleware = (req, res, next) => {
  const ALLOWED_ROLE_IDS = [
    '69fc5af582ef85451120772a', // admin
    '69fc5af582ef85451120772b', // bangiamdoc
    '69fc5af582ef85451120772c', // truongbophan
  ];
  if (req.user && ALLOWED_ROLE_IDS.includes(req.user.roleId)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Từ chối truy cập: Bạn không có quyền quản lý danh mục sản phẩm.',
  });
};

/**
 * @swagger
 * tags:
 *   - name: Product Categories
 *     description: Các API quản lý danh mục sản phẩm
 */

// GET all categories
router.get(
  '/',
  authMiddleware,
  productCategoryController.getAllCategories
);

// GET category by ID
router.get(
  '/:id',
  authMiddleware,
  productCategoryController.getCategoryById
);

// POST create category - KHÔNG CẦN UPLOAD
router.post(
  '/',
  authMiddleware,
  adminOnlyMiddleware,
  productCategoryController.createCategory
);

// PATCH update category - KHÔNG CẦN UPLOAD
router.patch(
  '/:id',
  authMiddleware,
  adminOnlyMiddleware,
  productCategoryController.updateCategory
);

// DELETE category
router.delete(
  '/:id',
  authMiddleware,
  adminOnlyMiddleware,
  productCategoryController.deleteCategory
);

module.exports = router;