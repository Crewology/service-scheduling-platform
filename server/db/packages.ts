import { eq, and, asc, desc } from "drizzle-orm";
import { servicePackages, packageItems, services, serviceCategories } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function createPackage(data: {
  providerId: number;
  name: string;
  description?: string;
  packagePrice: string;
  originalPrice: string;
  durationMinutes?: number;
  imageUrl?: string;
  serviceIds: number[];
}) {
  const db = await getDb();
  if (!db) return null;
  const { serviceIds, ...packageData } = data;
  const [result] = await db.insert(servicePackages).values(packageData);
  const packageId = result.insertId;

  if (serviceIds.length > 0) {
    await db.insert(packageItems).values(
      serviceIds.map((serviceId, idx) => ({
        packageId,
        serviceId,
        sortOrder: idx,
      }))
    );
  }

  return { id: packageId, ...packageData };
}

export async function updatePackage(packageId: number, providerId: number, data: {
  name?: string;
  description?: string;
  packagePrice?: string;
  originalPrice?: string;
  durationMinutes?: number;
  imageUrl?: string;
  serviceIds?: number[];
}) {
  const db = await getDb();
  if (!db) return null;
  const { serviceIds, ...updateData } = data;

  if (Object.keys(updateData).length > 0) {
    await db.update(servicePackages)
      .set(updateData)
      .where(and(eq(servicePackages.id, packageId), eq(servicePackages.providerId, providerId)));
  }

  if (serviceIds) {
    await db.delete(packageItems).where(eq(packageItems.packageId, packageId));
    if (serviceIds.length > 0) {
      await db.insert(packageItems).values(
        serviceIds.map((serviceId, idx) => ({
          packageId,
          serviceId,
          sortOrder: idx,
        }))
      );
    }
  }

  return { id: packageId };
}

export async function deletePackage(packageId: number, providerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(packageItems).where(eq(packageItems.packageId, packageId));
  await db.delete(servicePackages)
    .where(and(eq(servicePackages.id, packageId), eq(servicePackages.providerId, providerId)));
}

export async function getPackagesByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  const packages = await db.select().from(servicePackages)
    .where(and(eq(servicePackages.providerId, providerId), eq(servicePackages.isActive, true)))
    .orderBy(desc(servicePackages.createdAt));

  const items = await db
    .select({
      packageId: packageItems.packageId,
      serviceId: services.id,
      serviceName: services.name,
      categoryId: services.categoryId,
      basePrice: services.basePrice,
      hourlyRate: services.hourlyRate,
      pricingModel: services.pricingModel,
      durationMinutes: services.durationMinutes,
      categoryName: serviceCategories.name,
    })
    .from(packageItems)
    .innerJoin(services, eq(packageItems.serviceId, services.id))
    .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
    .orderBy(asc(packageItems.sortOrder));

  const itemMap = new Map<number, any[]>();
  for (const item of items) {
    if (!itemMap.has(item.packageId)) itemMap.set(item.packageId, []);
    itemMap.get(item.packageId)!.push(item);
  }

  return packages.map((pkg: any) => ({
    ...pkg,
    items: itemMap.get(pkg.id) || [],
  }));
}

export async function getPublicPackagesByProvider(providerId: number) {
  return getPackagesByProvider(providerId);
}
