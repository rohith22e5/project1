import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "./common.css";
import "./section3.css";

const Recommendations = ({ bestCrops, trendsData }) => {
  const [tabIndex, setTabIndex] = useState(0);

  // Ensure bestCrops is displayable whether it's an array or a string
  const displayCrops = Array.isArray(bestCrops) ? bestCrops.join(", ") : bestCrops;

  return (
    <div className="rec-container">
      <h4 className="inputheading">🌱 Best Crop Recommendations</h4>
      <div className="remedy-container">
        <p><strong>Best Suited Crop:</strong> {displayCrops || "Loading..."}</p>
      </div>
      
      <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)} className="Tabs">
        <TabList className="TabList">
          <Tab className="TabListitem">📊 Crop Suitability Trends</Tab>
        </TabList>
        <TabPanel>
          <h3 className="text-lg font-semibold" style={{ marginTop: "10px" }}>📊 Crop Suitability Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendsData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <CartesianGrid strokeDasharray="3 3" />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </TabPanel>
      </Tabs>
    </div>
  );
};

const CropRec = ({ data }) => (
  <div className="flex w-full h-screen p-6 gap-6 flex-col">
    {/* Pass the data object directly to Recommendations */}
    <Recommendations bestCrops={data.bestCrops} trendsData={data.trendsData} />
  </div>
);

export default CropRec;