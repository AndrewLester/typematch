// Workaround for https://github.com/nodejs/undici/issues/1602
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
