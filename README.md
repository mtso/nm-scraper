# nm-scraper
NeonMob card count and owner scraper.

Requires a valid neonmob account.

## Usage:

1. Run `$ git clone https://github.com/mtso/nm-scraper` on your command line.

2. Create a `credentials.json` file (in the project folder) with your account login info in the following format:
  ```
  {
    "user": "[username]",
    "pass": "[password]"
  }
  ```

3. Run the following on your command line: 

  `$ cd nm-scraper && node app.js [series-name-url]`
  
  Replace [series-name-url] with the name of the series as it appears in its url.
  So for `https://www.neonmob.com/series/sunflow-unlimited/`, the `[series-name-url]` would be `sunflow-unlimited`.
