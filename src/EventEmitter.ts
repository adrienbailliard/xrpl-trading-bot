import { NodeEvents, IssuerEvents, BaseEvents } from "./types";



export default class EventEmitter<Events extends Record<string, (...args: any[]) => any> & (NodeEvents | IssuerEvents)>
{
	private readonly eventCallbacks: { [T in keyof (Events & BaseEvents)]?: Array<(Events & BaseEvents)[T]> };


	constructor()
	{
		this.eventCallbacks = {};
	}


	on<T extends keyof (Events & BaseEvents)>(eventType: T, callback: (Events & BaseEvents)[T]): void
	{
		if (this.eventCallbacks[eventType] === undefined)
			this.eventCallbacks[eventType] = [];

		this.eventCallbacks[eventType].push(callback);
	}


	protected emit<T extends keyof Events>(eventType: T, ...args: Parameters<Events[T]>): void
	{
		this.eventCallbacks[eventType]?.forEach(async (callback) =>
		{
			try {
				await callback(...args);
			}
			catch (error)
			{
				this.emitError(error);
			}}
		);
	}


	private emitError(error: unknown): void
	{
		if (!this.eventCallbacks.error)
			throw error;

		this.eventCallbacks.error.forEach(callback => callback(error));
	}
}