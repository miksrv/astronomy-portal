"""A fake INDI server for trying the agent without hardware.

Serves the property definitions from tests/fixtures/indi_session.xml to every client, then
plays a short script: the camera exposure counts down, the roof closes after a while, a cloud
alert comes and goes. Read-only clients (like the agent) need nothing else.

    python tools/fake_indi.py --port 7624
"""

import argparse
import asyncio
from pathlib import Path

FIXTURE = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "indi_session.xml"

SCRIPT = [
    (20, '<setNumberVector device="ZWO CCD ASI6200MM Pro" name="CCD_EXPOSURE" state="Busy"><oneNumber name="CCD_EXPOSURE_VALUE">120</oneNumber></setNumberVector>'),
    (40, '<setLightVector device="Weather Watcher" name="WEATHER_STATUS" state="Alert"><oneLight name="WEATHER_CLOUDS">Alert</oneLight></setLightVector>'
         '<setNumberVector device="Weather Watcher" name="WEATHER_PARAMETERS" state="Alert"><oneNumber name="WEATHER_CLOUDS">78</oneNumber></setNumberVector>'),
    (50, '<setSwitchVector device="EQMod Mount" name="TELESCOPE_PARK" state="Ok"><oneSwitch name="PARK">On</oneSwitch><oneSwitch name="UNPARK">Off</oneSwitch></setSwitchVector>'
         '<setSwitchVector device="EQMod Mount" name="TELESCOPE_TRACK_STATE" state="Ok"><oneSwitch name="TRACK_ON">Off</oneSwitch><oneSwitch name="TRACK_OFF">On</oneSwitch></setSwitchVector>'
         '<setNumberVector device="ZWO CCD ASI6200MM Pro" name="CCD_EXPOSURE" state="Alert"><oneNumber name="CCD_EXPOSURE_VALUE">0</oneNumber></setNumberVector>'
         '<setTextVector device="Roll Roof" name="TELESCOPE" state="Ok"><oneText name="TELESCOPE">PARKED</oneText></setTextVector>'),
    (55, '<setTextVector device="Roll Roof" name="ROOF" state="Busy"><oneText name="ROOF">MOVE: CLOSING...</oneText></setTextVector>'),
    (66, '<setTextVector device="Roll Roof" name="ROOF" state="Ok"><oneText name="ROOF">CLOSED</oneText></setTextVector>'
         '<setSwitchVector device="Roll Roof" name="DOME_PARK" state="Ok"><oneSwitch name="PARK">On</oneSwitch><oneSwitch name="UNPARK">Off</oneSwitch></setSwitchVector>'),
]


async def client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    print("client connected")
    try:
        await reader.read(1024)  # <getProperties .../>
        writer.write(FIXTURE.read_bytes())
        await writer.drain()
        started = asyncio.get_running_loop().time()
        for at, xml in SCRIPT:
            await asyncio.sleep(max(0.0, started + at - asyncio.get_running_loop().time()))
            writer.write(xml.encode())
            await writer.drain()
            print(f"t+{at}s sent update")
        await reader.read()  # keep the connection until the client leaves
    except (ConnectionError, OSError):
        pass
    finally:
        writer.close()
        print("client left")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=7624)
    args = parser.parse_args()
    server = await asyncio.start_server(client, "127.0.0.1", args.port)
    print(f"fake INDI server on 127.0.0.1:{args.port}")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
