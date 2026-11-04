// MENU-GLITCH: a panel shows whole, not filling in. The panel is put up invisible (laid out, painted at no opacity, taking its taps),
// its pictures (its <img>s and the pictures its own styles name with url(...)) are decoded, and then it shows in one frame. A picture
// slow to come (a file still on its way) holds it back at most `cap` ms; past that the panel shows anyway and the picture comes when
// it comes, as before.

/** The pictures under `root` that are not ready to draw yet, as promises that settle once each is decoded (or fails). */
function pending(root: HTMLElement): Promise<unknown>[] {
  const jobs: Promise<unknown>[] = [];
  for (const im of root.querySelectorAll('img')) if (im.getAttribute('src')) jobs.push(im.decode().catch(() => undefined));
  const urls = new Set<string>();
  // (the pictures set on elements' own styles, and those the stylesheet gives the panel and its first two levels: its frame, its box)
  const near = [root, ...root.children, ...[...root.children].flatMap((c) => [...c.children])] as HTMLElement[];
  for (const e of [...near.map((n) => getComputedStyle(n).backgroundImage), ...[...root.querySelectorAll<HTMLElement>('[style*="url("]')].map((n) => n.style.backgroundImage)])
    for (const m of e.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.add(m[1]);
  for (const url of urls) {
    const im = new Image();
    im.src = url;
    jobs.push(im.decode().catch(() => undefined));
  }
  return jobs;
}

/** Hold `root` invisible until its pictures are decoded (at most `cap` ms), then show it. Resolves once it shows. */
export function showWhenPainted(root: HTMLElement, cap = 450): Promise<void> {
  const jobs = pending(root);
  if (!jobs.length) return Promise.resolve();
  root.classList.add('paintWait');
  return Promise.race([Promise.all(jobs), new Promise((ok) => setTimeout(ok, cap))]).then(() => {
    root.classList.remove('paintWait');
  });
}
