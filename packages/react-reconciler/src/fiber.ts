import type { Props, Key, Ref } from 'shared/ReactTypes';
import type { WorkTag } from './workTag';
import type { FLags } from './fiberFlags';
import type { Container } from 'hostConfig';
import { noFLags } from './fiberFlags';

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
	flag: FLags;
	updateQueue: unknown;
	memoizedState: any;
	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag;
		this.pendingProps = pendingProps;
		this.memoizedProps = null;
		this.key = key;
		this.type = null;
		this.stateNode = null;
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;
		this.ref = null;
		this.alternate = null;
		this.flag = noFLags;
		this.updateQueue = null;
		this.memoizedState = null;
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
	}
}
