import { mockAdminStats, mockBookings, mockCategories, mockProviders, mockServices } from '@/data/mockData'

function wait(ms = 450) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function getCategories() {
  await wait()
  return mockCategories
}

export async function getServices() {
  await wait()
  return mockServices
}

export async function getServiceById(id) {
  await wait(300)
  return mockServices.find((service) => String(service.id) === String(id))
}

export async function getProviders() {
  await wait()
  return mockProviders
}

export async function getProviderById(id) {
  await wait(300)
  return mockProviders.find((provider) => String(provider.id) === String(id))
}

export async function getBookings() {
  await wait()
  return mockBookings
}

export async function getAdminStats() {
  await wait()
  return mockAdminStats
}
