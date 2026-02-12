import { Dispatch } from 'react/src/currentDispatcher';
import type { Action } from 'shared/ReactTypes';
import { Lane } from './fiberLanes';

export interface Update<T> {
	action: Action<T>;
	lane: Lane;
	next: Update<any> | null;
}

export interface UpdateQueue<T> {
	shared: {
		pending: Update<T> | null;
	};
	dispatch: Dispatch<T> | null;
}
export function createUpdate<T>(action: Action<T>, lane: Lane): Update<T> {
	return {
		action,
		lane,
		next: null
	};
}

export function createUpdateQueue<T>(): UpdateQueue<T> {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	} as UpdateQueue<T>;
}

export function enqueueUpdate<T>(
	updateQueue: UpdateQueue<T>,
	update: Update<T>
) {
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		update.next = update;
	} else {
		update.next = pending.next;
		pending.next = update;
	}
	updateQueue.shared.pending = update;
}

export function processUpdateQueue<T>(
	baseState: T,
	pendingUpdate: Update<T> | null,
	renderLane: Lane
): { memoizedState: T } {
	const result = {
		memoizedState: baseState
	};
	if (pendingUpdate !== null) {
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<any>;
		do {
			const updateLane = pending.lane;
			if (updateLane === renderLane) {
				const action = pending.action;
				if (action instanceof Function) {
					baseState = action(baseState);
				} else {
					baseState = action;
				}
			} else {
				if (__DEV__) {
					console.error('不应该进入');
				}
			}
			pending = pending.next as Update<any>;
		} while (pending !== first);
	}
	result.memoizedState = baseState;
	return result;
}
