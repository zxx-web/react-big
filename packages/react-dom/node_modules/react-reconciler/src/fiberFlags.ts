export type FLags = number;
export const noFLags = 0b00000000000000;
export const placement = 0b00000000000001;
export const update = 0b00000000000010;
export const childDeletion = 0b00000000000100;
export const passiveEffect = 0b00000000001000;
export const Ref = 0b00000000010000;

export const mutationMask = placement | update | childDeletion | Ref;

export const layoutMask = Ref;

export const passiveMask = passiveEffect | childDeletion;
