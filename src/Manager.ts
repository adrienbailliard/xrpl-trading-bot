export default class Manager<T extends { id: string, destroy: () => void }>
{
	private items: Record<string, T> = {};


	add(item: T): void
	{
		this.items[item.id] = item;
	}


	get(id: string): T | undefined
	{
		return this.items[id];
	}


	destroyAll(): void
	{
		for (const id in this.items)
			this.items[id].destroy();
		
		this.items = {};
	}
}