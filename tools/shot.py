import sys, asyncio
from playwright.async_api import async_playwright
url, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 1200; h = int(sys.argv[4]) if len(sys.argv) > 4 else 900
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h})
        logs=[]; pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('ERR '+str(e)))
        await pg.goto(url)
        try: await pg.wait_for_function('window.READY===true', timeout=120000)
        except Exception as e: print('timeout', e)
        await pg.screenshot(path=out, full_page=True)
        print('\n'.join(logs[-15:]))
        await b.close()
asyncio.run(main())
