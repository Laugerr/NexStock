import { FastifyInstance } from 'fastify'
import { db } from '../../config/database'
import { createProductSchema, updateProductSchema, productQuerySchema } from './products.schema'
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  getProductCategories,
} from './products.service'
import { authorize } from '../../shared/middleware/authorize'
import { createAuditLog } from '../audit/audit.service'
import { buildPaginationArgs, paginatedResponse, successResponse } from '../../shared/utils/response'

export async function productRoutes(fastify: FastifyInstance) {
  // GET /api/v1/products
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, authorize('read', 'product')] },
    async (request, reply) => {
      const query = productQuerySchema.parse(request.query)
      const { page, limit, skip } = buildPaginationArgs(query)

      const { items, total } = await getProducts({
        skip,
        take: limit,
        search: query.search,
        category: query.category,
        isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
      })

      return reply.send(paginatedResponse(items, total, page, limit))
    },
  )

  // GET /api/v1/products/lookup?barcode=X&sku=Y
  fastify.get(
    '/lookup',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { barcode, sku } = request.query as { barcode?: string; sku?: string }

      const product = await db.product.findFirst({
        where: {
          OR: [
            ...(barcode ? [{ barcode }] : []),
            ...(sku ? [{ sku: { equals: sku, mode: 'insensitive' as const } }] : []),
          ],
          isActive: true,
        },
      })

      return reply.send(successResponse(product))
    },
  )

  // GET /api/v1/products/categories
  fastify.get(
    '/categories',
    { preHandler: [fastify.authenticate, authorize('read', 'product')] },
    async (_request, reply) => {
      const categories = await getProductCategories()
      return reply.send(successResponse(categories))
    },
  )

  // GET /api/v1/products/:id
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate, authorize('read', 'product')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const product = await getProductById(id)
      return reply.send(successResponse(product))
    },
  )

  // POST /api/v1/products
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, authorize('create', 'product')] },
    async (request, reply) => {
      const body = createProductSchema.parse(request.body)
      const product = await createProduct(body)

      await createAuditLog({
        userId: request.user.sub,
        action: 'CREATE',
        resource: 'product',
        resourceId: product.id,
        after: { sku: product.sku, name: product.name },
        ipAddress: request.ip,
      })

      return reply.code(201).send(successResponse(product))
    },
  )

  // PATCH /api/v1/products/:id
  fastify.patch(
    '/:id',
    { preHandler: [fastify.authenticate, authorize('update', 'product')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = updateProductSchema.parse(request.body)
      const before = await getProductById(id)
      const product = await updateProduct(id, body)

      await createAuditLog({
        userId: request.user.sub,
        action: 'UPDATE',
        resource: 'product',
        resourceId: id,
        before: { name: before.name, isActive: before.isActive },
        after: body,
        ipAddress: request.ip,
      })

      return reply.send(successResponse(product))
    },
  )
}
