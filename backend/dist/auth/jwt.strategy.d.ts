import { Strategy } from 'passport-jwt';
export interface JwtPayload {
    sub: string;
    email: string;
    tenantId: string;
    databaseUrl: string;
    role: string;
}
export declare const jwtConstants: {
    secret: string;
};
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: JwtPayload): Promise<JwtPayload>;
}
export {};
