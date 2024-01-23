// const puppeteer = require("puppeteer");
const UserAgent = require('user-agents');
const puppeteer = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");

const { executablePath } = require("puppeteer");
const fs = require("fs");
puppeteer.use(Stealth());

module.exports = class RelayTrips {
  constructor({ debug }) {
    this.debug = debug;

    /**
     * @typedef { puppeteer.Page } page
     */

    this.xpaths = {
      advanceSearchButton:
        '//*[@id="application"]/div/div[1]/div[2]/div/button',
      searchFieldById: '//*[@id="SearchFilter-SEARCH_ID-0"]',
      aBox: '//*[@id="authportal-main-section"]/div[2]/div[2]/div/form/div/div/div',
      TripSearchButton: '//*[@id="application"]/div/div[2]/div[6]/button[1]',
      login_password: '//*[@id="ap_password"]',
      login_email: '//*[@id="ap_email"]',
      loginButton: '//*[@id="signInSubmit"]',
    };
    this.defaultType = { delay: 50 };
    this.sleep = (waitTimeInMs) =>
      new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

    this.browser = null;
    this.page = null;
  }

  async init() {
    const options = {
      headless: this.debug ? false : "new",
      executablePath: executablePath(),
      defaultViewport: false,
    };
    const userAgent = new UserAgent({ platform: 'Win32' });
    this.browser = await puppeteer.launch(options);
    this.page = await this.browser.newPage();
    await this.page.emulate({
      name: "desktop",
      userAgent: userAgent.random().toString(),
      viewport: {
        width: 1280,
        height: 720,
      },
    });
   

    if (fs.existsSync("cookies.json")) {
      const serializedCookies = await fs.promises.readFile(
        "cookies.json",
        "utf8"
      );
      const cookies = JSON.parse(serializedCookies);
      await this.page.setCookie(...cookies);
    }

    await this.page.goto(
      "https://relay.amazon.com/tours/upcoming?ref=owp_nav_tours",
      { waitUntil: "domcontentloaded" }
    );
  }

  async inputPassword(password) {
    const passwordInput = await this.page.waitForXPath(
      this.xpaths.login_password
    );

    // await passwordInput.click();
    await passwordInput.type(password, this.defaultType);
  }
  async xpathToContent(xpath) {
    try {
      const modal = await this.page.waitForXPath(this.xpaths[xpath], {
        // visible: true
      });
      const text = await this.page.evaluate((el) => el.textContent, modal);

      return text;
    } catch (e) {
      return "Timed out";
    }
  }

  async login({ password = "", email = "" }) {
    const pass = password
    try { 
      let h1 = await this.page.waitForSelector('h1');
      let h1Text = await this.page.evaluate((ele) => ele.textContent, h1);
      if (!h1Text.includes("Sign in")) return;
      const loginSubButton = await this.page.waitForXPath(
        this.xpaths.loginButton
      );
      console.log("reached to sign in page \n");
      await this.inputPassword(pass);
      console.log("password typed \n");
      await loginSubButton.click();
      console.log("submit button clicked \n");
    } catch (err) {
      console.log("No login page come!");
    }
  }

  async searchTrip() {
    const advanceSearchButton = await this.page.waitForXPath(
      this.xpaths.advanceSearchButton
      // { visible: true }
    );

    await advanceSearchButton.click();
  }
  async getTripById({ tripId = "T-113FS6DZF" }) {
    if (!tripId) {
      console.log("Trip Id not found!");
      return;
    }

    const tripIdInput = await this.page.waitForXPath(
      this.xpaths.searchFieldById
    );
    await tripIdInput.type(tripId, this.defaultType);

    const TripSearchButton = await this.page.waitForXPath(
      this.xpaths.TripSearchButton
      // { visible: true }
    );
    await TripSearchButton.type(tripId, this.defaultType);

    TripSearchButton.click();
    const tripData = await this.scrapTripData({ tripId: tripId });
    return tripData;
  }
  async closePage() {
    if (this.browser) {
      await this.browser.close();
    }
  }
  async scrapTripData({ tripId = "" }) {
    if (!tripId) return;

    const selector = `div[data-type=${tripId}-tour-container]`;
    
    var tripData;
    await this.page.waitForSelector(selector);
    try {
      tripData = await this.page.$$eval(selector, async (tripElement) => {
        console.log('here is the trip element => ',tripElement[0])
        tripElement = tripElement[0];
        var tripID = null;
        var initialAddress = null;
        var initialAddDate = null;
        var finalAddress = null;
        var finalAddDate = null;
        var trailer = null;
        var licensePlate = null;
        var driverName = null;
        if (tripElement) {
          try {
            // tripID = tripElement.querySelector("div.css-15tgu9d > div > div > div > p")
            // .textContent || "not found";
            initialAddress =
              tripElement.querySelector("div.css-12lew07 > div > p.css-1qfu9cu")
                .textContent || "not found";
            initialAddDate =
              tripElement.querySelector("div.css-12lew07 > div > p.css-h0dfhx")
                .textContent || "not found";
            finalAddress =
              tripElement.querySelector("div.css-m2kw57 > div > p.css-1qfu9cu")
                .textContent || "not found";
            finalAddDate =
              tripElement.querySelector("div.css-m2kw57 > div > p.css-h0dfhx")
                .textContent || "not found";
            trailer = tripElement.querySelector(
              "div.css-1b0iax4 > div > div > div > p"
            ).textContent;
            licensePlate =
              tripElement.querySelector(
                "div.css-x6uis7 > div > div > p:nth-child(1)"
              ).textContent || "not found";
            licensePlate =
              licensePlate +
                " - " +
                tripElement.querySelector(
                  "div.css-x6uis7 > div > div > p:nth-child(2)"
                ).textContent || "not found";
          } catch (error) {console.log('Trip Element not found', error)}
          console.log("process one completed");
          return {
            initialAddress,
            initialAddDate,
            finalAddress,
            finalAddDate,
            trailer,
            licensePlate,
          };
        } else {
          console.log('trip element is null')
          return null;
        }
      });
    } catch (error) {
      console.log("element not found");
      console.log(error);
    }
    tripData['tripId'] = tripId;
    try {
      console.log("reach to process 2");
      let expander = await this.page.waitForSelector(
        `div.css-1xq2324 > div.css-bgyw74 > div > div > div:nth-child(1) > div`
      );
      // div[data-id=${tripId}-tour-expander]
      await expander.evaluate((ele) => ele.click());
      console.log("clicked on dropdown");

      let itemDetails = await this.page.$$eval(
        `#expander-content > div > div > div.css-15q25lf`,
       async (items) => {
          console.log("here is the length of items => ", items.length);
          var result = [];
          
          for (const item of items) {
            // console.log("here is the item  => ", item);
            var loadID =
              item.querySelector(
                "div.css-v4hdye > div > div > div > div > p.css-xc8phd"
              )?.textContent || "not found";
            var origin =
              item.querySelector(
                "div.css-1otju48 > div > div.css-12lew07 > div > p"
              )?.textContent || "not found";
            var destination =
              item.querySelector(
                "div.css-1otju48 > div > div.css-m2kw57 > div > p"
              )?.textContent || "not found";
            var distanceInMiles =
              item.querySelector("div.css-1w8kdgk > div > div > div > p")
                ?.textContent || "not found";
            var timeToCoverDistance =
              item.querySelector("div.css-1w8kdgk > div > div > p")
                ?.textContent || "not found";
            var loadingUnloadingType =
              item.querySelector("div.css-x6uis7 > div > div > p")
                ?.textContent || "not found";

            item.querySelector('div').click()
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('here are the inner of css-pqqw1q the item => ', item.querySelectorAll(".css-pqqw1q"))
            var origin_point_adress = item.querySelector("div.css-pqqw1q").children[0].querySelector('.css-1qx2sv2').textContent || "not found";
            var base_address = item.querySelector("div.css-pqqw1q").children[3].querySelector('.css-1qx2sv2').textContent || "not found";
              
            result.push({
              loadID,
              name:origin,
              doc:{
                origin_point_name:origin,
                origin_point_adress,
                base_address,
              },
              destination,
              distanceInMiles,
              timeToCoverDistance,
              loadingUnloadingType,
            });
            
          }
          return result;
        });

      tripData["points"] = itemDetails;
      console.log("items data: ", tripData);
      return tripData;
    } catch (error) {
      console.log(error);
    }
  }
  
};
