import { Dispatch } from 'react/src/currentDispatcher';
import type { Action } from 'shared/ReactTypes';
import { isSubsetOfLanes, Lane, NoLane } from './fiberLanes';

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
// pending --> last update --> first update --> second update --> ... --> last update
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
): { memoizedState: T; baseState: T; baseQueue: Update<T> | null } {
	const result: ReturnType<typeof processUpdateQueue<T>> = {
		memoizedState: baseState,
		baseState,
		baseQueue: null
	};
	if (pendingUpdate !== null) {
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<any>;
		let newBaseState = baseState;
		let newBaseQueueFirst: Update<T> | null = null;
		let newBaseQueueLast: Update<T> | null = null;
		let newState = baseState;
		do {
			const updateLane = pending.lane;
			if (!isSubsetOfLanes(renderLane, updateLane)) {
				// 优先级不够
				const clone = createUpdate(pending.action, pending.lane);
				if (newBaseQueueFirst === null) {
					newBaseQueueFirst = clone;
					newBaseQueueLast = clone;
					newBaseState = newState;
				} else {
					(newBaseQueueLast as Update<T>).next = clone;
					newBaseQueueLast = clone;
				}
			} else {
				// 优先级够
				if (newBaseQueueLast !== null) {
					const clone = createUpdate(pending.action, NoLane);
					(newBaseQueueLast as Update<T>).next = clone;
					newBaseQueueLast = clone;
				}
				const action = pending.action;
				if (action instanceof Function) {
					newState = action(newState);
				} else {
					newState = action;
				}
			}
			pending = pending.next as Update<any>;
		} while (pending !== first);
		if (newBaseQueueLast === null) {
			newBaseState = newState;
		} else {
			newBaseQueueLast.next = newBaseQueueFirst;
		}
		result.memoizedState = newState;
		result.baseState = newBaseState;
		result.baseQueue = newBaseQueueLast;
	}
	return result;
}
