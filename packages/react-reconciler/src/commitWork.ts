import { appendChildToContainer, Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
	mutationMask,
	noFLags,
	placement,
	update,
	childDeletion
} from './fiberFlags';
import { HostComponent, HostRoot, HostText } from './workTag';

let nextEffect: FiberNode | null = null;
export function commitMutationEffects(finishedWork: FiberNode) {
	nextEffect = finishedWork;
	while (nextEffect !== null) {
		const child: FiberNode | null = nextEffect.child;
		if (
			(nextEffect.subtreeFlags & mutationMask) !== noFLags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				} else {
					const parent: FiberNode | null = nextEffect.return;
					if (parent !== null) {
						nextEffect = parent;
					}
				}
			}
		}
	}
}

const commitMutationEffectsOnFiber = (fiber: FiberNode) => {
	const { flags } = fiber;
	if ((flags & placement) !== noFLags) {
		commitPlacement(fiber);
		fiber.flags &= ~placement;
	}
	if ((flags & update) !== noFLags) {
		commitUpdate(fiber);
		fiber.flags &= ~update;
	}
	if ((flags & childDeletion) !== noFLags) {
		commitDeletion(fiber);
		fiber.flags &= ~childDeletion;
	}
};

const commitPlacement = (fiber: FiberNode) => {
	if (__DEV__) {
		console.warn('commitPlacement', fiber);
	}
	const parent = getHostParent(fiber);
	appendPlacementNodeToContainer(fiber, parent);
};
const commitUpdate = (fiber: FiberNode) => {
	console.log(fiber);
};
const commitDeletion = (fiber: FiberNode) => {
	console.log(fiber);
};

function getHostParent(fiber: FiberNode): Container {
	let parent = fiber.return;
	let result: Container | null = null;
	while (parent !== null) {
		const parentTag = parent.tag;
		if (parentTag === HostComponent) {
			result = parent.stateNode;
			break;
		}
		if (parentTag === HostRoot) {
			result = (parent.stateNode as FiberRootNode).container;
			break;
		}
		parent = parent.return;
	}
	if (__DEV__) {
		console.warn('getHostParent not found', fiber);
	}
	return result!;
}

function appendPlacementNodeToContainer(
	fiber: FiberNode,
	hostParent: Container
) {
	if (fiber.tag === HostComponent || fiber.tag === HostText) {
		appendChildToContainer(hostParent, fiber.stateNode);
		return;
	}
	const child = fiber.child;
	if (child !== null) {
		appendPlacementNodeToContainer(child, hostParent);
		let sibling = child.sibling;
		while (sibling !== null) {
			appendPlacementNodeToContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
