import asyncio, base64
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(); logs=[]; pg.on('pageerror', lambda e: logs.append(str(e)))
        await pg.goto('http://localhost:8765/dev_portraits.html')
        await pg.wait_for_function('window.READY===true', timeout=120000)
        out = await pg.evaluate('window.OUT')
        for k, v in out.items(): open(f'public/img/{k}.jpg','wb').write(base64.b64decode(v.split(',')[1]))
        print(logs, list(out)); await b.close()
asyncio.run(main())
