export type FLags = number;
export const noFLags = 0b0000000;
export const placement = 0b0000001;
export const update = 0b0000010;
export const childDeletion = 0b0000100;
export const passiveEffect = 0b0001000;

export const mutationMask = placement | update | childDeletion;

export const passiveMask = passiveEffect | childDeletion;
