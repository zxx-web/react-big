import type { Action } from 'shared/ReactTypes';

export interface Update<T> {
	action: Action<T>;
}

export interface UpdateQueue<T> {
	shared: {
		pending: Update<T> | null;
	};
}
export function createUpdate<T>(action: Action<T>): Update<T> {
	return {
		action
	};
}

export function createUpdateQueue<T>(): UpdateQueue<T> {
	return {
		shared: {
			pending: null
		}
	} as UpdateQueue<T>;
}

export function enqueueUpdate<T>(
	updateQueue: UpdateQueue<T>,
	update: Update<T>
) {
	updateQueue.shared.pending = update;
}

export function processUpdateQueue<T>(
	baseState: T,
	pendingUpdate: Update<T> | null
): { memoizedState: T } {
	const result = {
		memoizedState: baseState
	};
	if (pendingUpdate !== null) {
		const action = pendingUpdate.action;
		if (action instanceof Function) {
			result.memoizedState = action(baseState);
		} else {
			result.memoizedState = action;
		}
	}
	return result;
}
