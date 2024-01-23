const express = require('express')
const RelayTrips = require("./utils/functions");
const client = new RelayTrips({ debug: true });


const app = express();
const port = 6000; // 


const getTripById = async (trip_id = null) => {
  if (!trip_id) {
    console.log("No trip Id found");
    return;
  }
  await client.init();

  client.login({ password: process.env.USER_PASSWORD, email: "" });
  console.log("logged in");
  // return
  await client.searchTrip();
  const tripData = await client.getTripById({ tripId: trip_id }); //"T-113FS6DZF"
  await client.closePage();
  return tripData;
};

module.exports = getTripById;



app.get('/getTripById/:trip_id', async (req, res) => {
  try {
    const tripId = req.params.trip_id;
    const tripData = await getTripById(tripId);
    if(tripData){
      res.status(200).json({'msg':'Successfully retrieved trip information.', 'status':true, tripData});
    }else{
      res.status(200).json({'msg':'cannot get trip data now!', 'status':false, tripData});
    }
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/get_upcoming_trips_csv', async (res, res) => {
  try {
    
  } catch (err) {
    
  }
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
