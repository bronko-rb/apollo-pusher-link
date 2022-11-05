import { ApolloLink, Observable, Observer, Operation, NextLink, FetchResult } from '@apollo/client/core'
import Pusher from 'pusher-js'

type RequestResult = FetchResult<{ [key: string]: any; }, Record<string, any>, Record<string, any>>

type Subscription = {
	closed: boolean;
	unsubscribe(): void;
}

class PusherLink extends ApolloLink {
	pusher: Pusher
	decompress: (result: string) => any

	constructor(options: { pusher: Pusher, decompress?: (result: string) => any}) {
		super()
		this.pusher = options.pusher
		if (options.decompress) {
			this.decompress = options.decompress
		} else {
			this.decompress = function(_result: string) {
				throw new Error("Received compressed_result but PusherLink wasn't configured with `decompress: (result: string) => any`. Add this configuration.")
			}
		}
	}

	request(operation: Operation, forward: NextLink): Observable<RequestResult> {
		const subscribeObservable = new Observable<RequestResult>((_observer: any) => {  })
		const prevSubscribe = subscribeObservable.subscribe.bind(subscribeObservable)
		subscribeObservable.subscribe = (
			observerOrNext: Observer<RequestResult> | ((value: RequestResult) => void),
			onError?: (error: any) => void,
			onComplete?: () => void
		): Subscription => {
			if (typeof(observerOrNext) == 'function') {
				prevSubscribe(observerOrNext, onError, onComplete)
			} else {
				prevSubscribe(observerOrNext)
			}
			const observer = getObserver(observerOrNext, onError, onComplete)
			var subscriptionChannel: string
			const resultObservable = forward(operation)
			resultObservable.subscribe({ next: (data: any) => {
					subscriptionChannel = data?.extensions?.lighthouse_subscriptions?.channel
					if (subscriptionChannel) {
						const pusherChannel = this.pusher.subscribe(subscriptionChannel)
						pusherChannel.bind('lighthouse-subscription', (payload: any) => {
							this._onUpdate(subscriptionChannel, observer, payload)
						})
					} else {
						observer.next(data)
						observer.complete()
					}
				},
				error: observer.error,
			})

			return {
				closed: false,
				unsubscribe: () => {
					subscriptionChannel && this.pusher.unsubscribe(subscriptionChannel)
				},
			}
		}
		return subscribeObservable
	}

	_onUpdate(subscriptionChannel: string, observer: { next: Function, complete: Function }, payload: {more: boolean, compressed_result?: string, result?: object}): void {
		let result: any
		if (payload.compressed_result) {
			result = this.decompress(payload.compressed_result)
		} else {
			result = payload.result
		}
		if (result) {
			observer.next(result)
		}
		if (!payload.more) {
			this.pusher.unsubscribe(subscriptionChannel)
			observer.complete()
		}
	}
}


function getObserver<T>(
	observerOrNext: Function | Observer<T>,
	onError?: (e: Error) => void,
	onComplete?: () => void,
) {
	if (typeof observerOrNext === 'function') {
		return {
			next: (v: T) => observerOrNext(v),
			error: (e: Error) => onError && onError(e),
			complete: () => onComplete && onComplete(),
		}
	} else {
		return {
			next: (v: T) => observerOrNext.next && observerOrNext.next(v),
			error: (e: Error) => observerOrNext.error && observerOrNext.error(e),
			complete: () => observerOrNext.complete && observerOrNext.complete(),
		}
	}
}

export default PusherLink
