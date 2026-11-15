import asyncio
from playwright.async_api import async_playwright
OUT='/home/claude/neon2/test/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(viewport={'width':760,'height':360})
        A=await ctx.new_page(); B=await ctx.new_page(); logs=[]
        for n,pg in (('A',A),('B',B)):
            pg.on('pageerror',lambda e,n=n: logs.append(n+' PAGEERR '+str(e)))
            await pg.route('**/fonts.g*/**',lambda r:r.abort()); await pg.route('**/peerjs*',lambda r:r.abort())
            await pg.goto('http://localhost:8780/index.html#mocknet'); await pg.wait_for_timeout(400)
            await pg.click('[data-go=online]'); await pg.wait_for_timeout(200)
        await A.click('#bHost'); await A.wait_for_timeout(300)
        await B.fill('#joinCode','TEST1'); await B.click('#bJoin'); await B.wait_for_timeout(800)
        await A.click('.card[data-id=vega]'); await B.click('.card[data-id=sombra]'); await A.wait_for_timeout(300)
        await A.screenshot(path=OUT+'o_select.png')
        await A.click('#bConfirm'); await B.click('#bConfirm'); await A.wait_for_timeout(800)
        await A.screenshot(path=OUT+'o_vs.png')
        await A.wait_for_timeout(4500)
        await A.screenshot(path=OUT+'o_fightA.png'); await B.screenshot(path=OUT+'o_fightB.png')
        # A camina hacia delante y ataca; B bloquea
        await A.keyboard.down('d'); await A.wait_for_timeout(1200); await A.keyboard.up('d')
        for k in ['j','ArrowRight','j','ArrowLeft']:
            await A.keyboard.press(k); await A.wait_for_timeout(500)
        await B.keyboard.press('ArrowRight'); await B.wait_for_timeout(1500)
        await A.screenshot(path=OUT+'o_fightA2.png'); await B.screenshot(path=OUT+'o_fightB2.png')
        sa=await A.evaluate("[window.__app.M.frame, window.__app.M.fighters.map(f=>f.hp), window.__app.M.phase, window.__app.ls.resyncs, document.getElementById('perf').textContent]")
        sb=await B.evaluate("[window.__app.M.frame, window.__app.M.fighters.map(f=>f.hp), window.__app.M.phase, window.__app.ls.resyncs]")
        print('A',sa); print('B',sb)
        # forzar fin de partida rápido: quitar vida en ambos (misma operación determinista)
        print('\n'.join(logs[:10])); await b.close()
asyncio.run(main())
