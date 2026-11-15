import asyncio, sys
from playwright.async_api import async_playwright
char = sys.argv[1] if len(sys.argv) > 1 else 'vega'
seq = sys.argv[2] if len(sys.argv) > 2 else 'idle:;jab:j;fwd:arrowright;up:arrowup;jump:w'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width':844,'height':390}, device_scale_factor=1)
        pg = await ctx.new_page(); logs = []
        pg.on('pageerror', lambda e: logs.append('PAGEERR '+str(e))); pg.on('console', lambda m: logs.append(m.type+' '+m.text) if m.type in ('error','warning') else None)
        await pg.route('**/fonts.g*/**', lambda r: r.abort()); await pg.route('**/peerjs*', lambda r: r.abort())
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.click('[data-go=practice]'); await pg.wait_for_timeout(300)
        await pg.click(f'.card[data-id={char}]'); await pg.wait_for_timeout(200)
        await pg.click('#bConfirm'); await pg.wait_for_timeout(6000)
        for item in seq.split(';'):
            name, keys = item.split(':')
            for k in [k for k in keys.split('+') if k]:
                K = {'arrowright':'ArrowRight','arrowleft':'ArrowLeft','arrowup':'ArrowUp','arrowdown':'ArrowDown','space':' '}.get(k,k)
                await pg.keyboard.down(K); await pg.wait_for_timeout(40); await pg.keyboard.up(K)
            for i,dt in enumerate([int(x) for x in (sys.argv[3] if len(sys.argv)>3 else '120,250').split(',')]):
                await pg.wait_for_timeout(dt)
                await pg.screenshot(path=f'/tmp/shots/{char}_{name}_{i}.png')
            await pg.wait_for_timeout(900)
        print('\n'.join(logs[-10:])); await b.close()
asyncio.run(main())
