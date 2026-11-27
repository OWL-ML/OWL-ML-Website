import type { APIRoute } from 'astro';
import { frame, toSvg, STILL_T } from '../components/home/network-loop';

// The hero figure's static frame (HeroNetwork.astro): shown first, without JavaScript and under
// reduced motion. Built from the same code as the animation.
export const GET: APIRoute = () =>
  new Response(toSvg(frame(STILL_T)), { headers: { 'Content-Type': 'image/svg+xml' } });
