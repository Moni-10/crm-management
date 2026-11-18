import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { passwordVersion } from './users.js';

export const signToken = (user) =>
    jwt.sign({ sub: user.id, pv: passwordVersion(user) }, config.auth.jwtSecret, { expiresIn: config.auth.tokenTtl });

export const verifyToken = (token) => jwt.verify(token, config.auth.jwtSecret);
