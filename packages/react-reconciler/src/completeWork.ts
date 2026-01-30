import type { FiberNode } from './fiber';

export const completeWork = (fiber: FiberNode) => {
	console.log(fiber);
};
