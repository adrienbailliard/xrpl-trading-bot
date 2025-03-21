export default class CircularBuffer<T>
{
	private readonly array: Array<T>;
	
	private head: number;
	private size: number;



	constructor(capacity: number)
	{
		if (capacity === 0)
			throw new Error("Parameter is equal to 0!");

		this.array = new Array(capacity);
		this.head = 0;
		this.size = 0;
	}



	fill(element: T): void
	{
		this.array.fill(element);
		this.size = this.array.length;
	}



	push(element: T): void
	{
		this.array[this.head] = element;
		this.head = (this.head + 1) % this.array.length;
		this.size = Math.min(this.size + 1, this.array.length);
	}



	shift(): T | undefined
	{
		if (this.size > 0)
		{
			const index: number = (this.head - this.size + this.array.length) % this.array.length;
			this.size--;

			return this.array[index];
		}
	}
}