import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue,
	UpdateQueue
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLane } from './fiberLanes';

let currentlyRenderFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;
const { currentDispatcher } = internals;
interface Hook {
	memoizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}
export function renderWithHooks(wip: FiberNode, lane: Lane) {
	currentlyRenderFiber = wip;
	renderLane = lane;
	wip.memoizedState = null;

	const current = wip.alternate;

	if (current !== null) {
		currentDispatcher.current = HooksDisptcherOnUpdate;
	} else {
		currentDispatcher.current = HooksDisptcherOnMount;
	}
	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);
	currentlyRenderFiber = null;
	workInProgressHook = null;
	currentHook = null;
	renderLane = NoLane;
	return children;
}

const HooksDisptcherOnMount: Dispatcher = {
	useState: mountState
};

const HooksDisptcherOnUpdate: Dispatcher = {
	useState: updateState
};

function mountState<T>(initialState: () => T | T): [T, Dispatch<T>] {
	const hook = mountWorkInProgressHook();
	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}
	hook.memoizedState = memoizedState;
	const queue = createUpdateQueue();
	hook.updateQueue = queue;
	const dispatch = dispatchSetState.bind(null, currentlyRenderFiber!, queue);
	queue.dispatch = dispatch;
	return [memoizedState, dispatch];
}

function updateState<T>(): [T, Dispatch<T>] {
	const hook = updateWorkInProgressHook();

	const queue = hook.updateQueue as UpdateQueue<T>;
	const pending = queue.shared.pending;
	if (pending !== null) {
		const { memoizedState } = processUpdateQueue(
			hook.memoizedState,
			pending,
			renderLane
		);
		hook.memoizedState = memoizedState;
	}

	return [hook.memoizedState, queue.dispatch as Dispatch<T>];
}

function updateWorkInProgressHook(): Hook {
	let nextCurrentHook: Hook | null = null;
	if (currentHook === null) {
		const currentFiber = currentlyRenderFiber?.alternate;
		if (currentFiber !== null) {
			nextCurrentHook = currentFiber?.memoizedState;
		} else {
			nextCurrentHook = null;
		}
	} else {
		nextCurrentHook = currentHook.next;
	}
	if (nextCurrentHook === null) {
		throw new Error(`组件${currentlyRenderFiber?.type}本次执行hooks比上次多`);
	}
	currentHook = nextCurrentHook;
	const newHook: Hook = {
		memoizedState: currentHook?.memoizedState,
		updateQueue: currentHook?.updateQueue,
		next: null
	};
	if (workInProgressHook === null) {
		if (currentlyRenderFiber === null) {
			throw new Error('请在函数组件中使用hook');
		} else {
			workInProgressHook = newHook;
			currentlyRenderFiber.memoizedState = workInProgressHook;
		}
	} else {
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}
	return workInProgressHook;
}
function dispatchSetState<T>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<T>,
	action: Action<T>
) {
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);
	enqueueUpdate(updateQueue, update);
	scheduleUpdateOnFiber(fiber, lane);
}
function mountWorkInProgressHook() {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null
	};
	if (workInProgressHook === null) {
		if (currentlyRenderFiber === null) {
			throw new Error('请在函数组件中使用hook');
		} else {
			workInProgressHook = hook;
			currentlyRenderFiber.memoizedState = workInProgressHook;
		}
	} else {
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}
	return workInProgressHook;
}
