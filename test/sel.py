import asyncio
from playwright.async_api import async_playwright
OUT='/home/claude/neon2/test/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(viewport={'width':844,'height':390},device_scale_factor=2,is_mobile=True,has_touch=True)
        pg=await ctx.new_page(); logs=[]
        pg.on('pageerror',lambda e: logs.append('PAGEERR '+str(e)))
        await pg.route('**/fonts.g*/**',lambda r:r.abort()); await pg.route('**/peerjs*',lambda r:r.abort())
        await pg.goto('http://localhost:8780/index.html'); await pg.wait_for_timeout(500)
        await pg.tap('[data-go=practice]'); await pg.wait_for_timeout(400)
        await pg.tap('.card[data-id=kai]'); await pg.wait_for_timeout(200)
        await pg.tap('.wchip[data-w=dagger]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT+'sel_kai_dagger.png')
        await pg.tap('#bConfirm'); await pg.tap('#stageConfirm'); await pg.wait_for_timeout(2500)
        await pg.tap('#bMoves'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=OUT+'game_kai_dagger.png')
        print(logs); await b.close()
asyncio.run(main())
