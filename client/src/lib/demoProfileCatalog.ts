type DemoService = {
  id: number;
  name: string;
  categoryId: number;
  description?: string | null;
};

type DemoCategory = { id: number; name: string };

/** Editorial entry points are existing demo services, never invented listings or IDs. */
const featuredNames = [
  "Demo Barber Haircut",
  "Demo Home Cleaning",
  "Demo AV Setup Consultation",
  "Demo Handyman Visit",
];

export function selectFeaturedDemoServices<T extends DemoService>(services: readonly T[]): T[] {
  const selected: T[] = [];
  for (const name of featuredNames) {
    const match = services.find(service => service.name === name);
    if (match && !selected.some(service => service.id === match.id)) selected.push(match);
  }
  for (const service of services) {
    if (selected.length >= 4) break;
    if (!selected.some(item => item.id === service.id)) selected.push(service);
  }
  return selected;
}

/** Searches all existing demo records; the category filter and text query compose. */
export function filterDemoServices<T extends DemoService>(
  services: readonly T[],
  categories: readonly (DemoCategory | undefined)[],
  category: string,
  query: string,
): T[] {
  const search = query.trim().toLocaleLowerCase();
  return services.filter(service => {
    if (category !== "all" && String(service.categoryId) !== category) return false;
    if (!search) return true;
    const categoryName = categories.find(item => item?.id === service.categoryId)?.name ?? "";
    return [service.name, service.description ?? "", categoryName]
      .some(value => value.toLocaleLowerCase().includes(search));
  });
}
