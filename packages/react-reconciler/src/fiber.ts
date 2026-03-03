import type {
	Props,
	Key,
	Ref,
	ReactElementType,
	Wakeable
} from 'shared/ReactTypes';
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	MemoComponent,
	OffscreenComponent,
	SuspenseComponent,
	type WorkTag
} from './workTag';
import type { FLags } from './fiberFlags';
import type { Container } from 'hostConfig';
import { noFLags } from './fiberFlags';
import { Lane, Lanes, NoLane, NoLanes } from './fiberLanes';
import { Effect } from './fiberHooks';
import { CallbackNode } from 'scheduler';
import {
	REACT_MEMO_TYPE,
	REACT_PROVIDER_TYPE,
	REACT_SUSPENSE_TYPE
} from 'shared/ReactSymbols';
import { ContextItem } from './fiberContext';

export interface OffscreenProps {
	mode: 'visible' | 'hidden';
	children: any;
}

interface FiberDependencies<T> {
	firstContext: ContextItem<T> | null;
	lanes: Lanes;
}

export class FiberNode {
	type: any;
	tag: WorkTag;
	pendingProps: Props;
	key: Key;
	stateNode: any;
	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;
	ref: Ref;
	memoizedProps: Props | null;
	alternate: FiberNode | null;
	flags: FLags;
	subtreeFlags: FLags;
	updateQueue: unknown;
	memoizedState: any;
	deletions: FiberNode[] | null;
	lanes: Lanes;
	childLanes: Lanes;
	dependencies: FiberDependencies<any> | null;
	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag;
		this.pendingProps = pendingProps;
		this.memoizedProps = null;
		this.key = key ?? null;
		this.type = null;
		this.stateNode = null;
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;
		this.ref = null;
		this.alternate = null;
		this.flags = noFLags;
		this.subtreeFlags = noFLags;
		this.updateQueue = null;
		this.memoizedState = null;
		this.deletions = null;
		this.lanes = NoLanes;
		this.childLanes = NoLanes;
		this.dependencies = null;
	}
}
export interface PendingPassiveEffects {
	unmount: Effect[];
	update: Effect[];
}
export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	pendingLanes: Lanes;
	finishLane: Lane;
	pendingPassiveEffects: PendingPassiveEffects;
	callbackNode: CallbackNode | null;
	callbackPriority: Lane;
	pingCache: WeakMap<Wakeable<any>, Set<Lane>> | null;
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
		this.pendingLanes = NoLanes;
		this.finishLane = NoLane;
		this.pendingPassiveEffects = {
			unmount: [],
			update: []
		};
		this.callbackNode = null;
		this.callbackPriority = NoLane;
		this.pingCache = null;
	}
}

export function createFiberFromElement(element: ReactElementType): FiberNode {
	const { type, key, props, ref } = element;
	let fiberTag: WorkTag = FunctionComponent;
	if (typeof type === 'string') {
		fiberTag = HostComponent;
	} else if (typeof type === 'object') {
		switch (type.$$typeof) {
			case REACT_PROVIDER_TYPE:
				fiberTag = ContextProvider;
				break;
			case REACT_MEMO_TYPE:
				fiberTag = MemoComponent;
				break;
			default:
				console.warn('未实现的type类型:' + element);
				break;
		}
	} else if (type === REACT_SUSPENSE_TYPE) {
		fiberTag = SuspenseComponent;
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的type类型', element);
	}
	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	fiber.ref = ref;
	return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
	const fiber = new FiberNode(Fragment, elements, key);
	return fiber;
}

export function createFiberFromOffscreen(
	pendingProps: OffscreenProps
): FiberNode {
	const fiber = new FiberNode(OffscreenComponent, pendingProps, null);
	return fiber;
}
