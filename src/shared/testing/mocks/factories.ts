import { faker } from '@faker-js/faker'

export const mockFactories = {
  // User factory
  createUser: (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    avatar: faker.image.avatar(),
    role: faker.helpers.arrayElement(['admin', 'user', 'manager']),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  }),

  // Project factory
  createProject: (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement(['draft', 'active', 'completed', 'cancelled']),
    startDate: faker.date.past().toISOString(),
    endDate: faker.date.future().toISOString(),
    budget: faker.number.int({ min: 10000, max: 1000000 }),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  }),

  // Library item factory
  createLibraryItem: (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    code: faker.string.alphanumeric(8).toUpperCase(),
    description: faker.lorem.sentence(),
    unit: faker.helpers.arrayElement(['m', 'm2', 'm3', 'kg', 'pc', 'hr']),
    unitCost: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    category: faker.helpers.arrayElement(['materials', 'labor', 'equipment']),
    division: faker.helpers.arrayElement(['concrete', 'masonry', 'metals', 'wood']),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  }),

  // Purchase order factory
  createPurchaseOrder: (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    poNumber: faker.string.alphanumeric(10).toUpperCase(),
    supplier: faker.company.name(),
    description: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['draft', 'pending', 'approved', 'rejected']),
    totalAmount: faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 }),
    currency: 'USD',
    orderDate: faker.date.past().toISOString(),
    deliveryDate: faker.date.future().toISOString(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  }),

  // Cost estimate factory
  createCostEstimate: (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    name: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    totalCost: faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 }),
    currency: 'USD',
    status: faker.helpers.arrayElement(['draft', 'pending', 'approved', 'rejected']),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  }),

  // Generic factory for any object
  createMockData: <T>(template: T, overrides?: Partial<T>): T => ({
    ...template,
    ...overrides,
  }),

  // Array factory
  createArray: <T>(factory: () => T, count: number = 5): T[] => 
    Array.from({ length: count }, factory),
}