import { useState } from "react";
import "./Tutorial.css";

const tutorialsList = [
  {
    title: "How to Improve Soil Quality",
    video: "https://www.youtube.com/embed/YN7nUHkvxwo?si=XgdOvazrb0wZkc_N",
    description: "Best practices for maintaining and improving soil health.",
    category: "Soil Health",
  },
  {
    title: "Effective Pest Management",
    video: "https://www.youtube.com/embed/tnn4R0j3f-4?si=z7c_O_eWKk2XqNa7",
    description: "Learn how to control pests organically and safely.",
    category: "Pest Control",
  },
  {
    title: "Smart Irrigation Techniques",
    video: "https://www.youtube.com/embed/dxRY0Mpejgk",
    description: "Optimize water usage with smart irrigation.",
    category: "Irrigation",
  },
  {
    title: "Balanced Fertilization Tips",
    video: "https://www.youtube.com/embed/y9b2p69CxCk?si=FKXsvdevkUg4O-qT",
    description: "Guide to choosing and applying fertilizers effectively.",
    category: "Fertilization",
  },
  {
    title: "Using Modern Farm Equipment",
    video: "https://www.youtube.com/embed/1VNr2AyJ71w?si=CqAX-Oeaq2wutk-C",
    description: "Intro to handling and maintaining equipment.",
    category: "Equipment",
  },
  // New Tutorials you gave:
  {
    title: "Organic Farming Practices",
    video: "https://www.youtube.com/embed/n7nG-gHcv4I?si=opbbxjFiB-oPP3JK",
    description: "Learn about sustainable organic farming techniques.",
    category: "Soil Health",
  },
  {
    title: "Integrated Pest Management",
    video: "https://www.youtube.com/embed/VaDccWJJ864?si=dKUVpYGkecPTA2CA",
    description: "Combining biological, cultural, and chemical tools for pest control.",
    category: "Pest Control",
  },
  {
    title: "Efficient Water Management",
    video: "https://www.youtube.com/embed/W6E_MyVjQX4?si=tYltNulgeRx6_oPi",
    description: "Best practices for water conservation and irrigation.",
    category: "Irrigation",
  },
  {
    title: "Advanced Fertilizer Application",
    video: "https://www.youtube.com/embed/Z9HAy9EYKKs?si=1zgqFUbZm2WPrrSy",
    description: "How to apply fertilizers for maximum crop yield.",
    category: "Fertilization",
  },
  {
    title: "Farm Machinery Maintenance",
    video: "https://www.youtube.com/embed/rXT5HwH-l9w?si=x8FRW4sGlz8_5GbD",
    description: "Keep your farming equipment in top shape.",
    category: "Equipment",
  },
  {
    title: "Vermicomposting Techniques",
    video: "https://www.youtube.com/embed/Ulf8E1XnhgI?si=LcKXMD77vdqQ6NmE",
    description: "Use worms to improve soil fertility naturally.",
    category: "Soil Health",
  },
  {
    title: "Eco-friendly Pest Repellents",
    video: "https://www.youtube.com/embed/Lm4p_ZfZGhk?si=FH8YCWZSeI7BFe56",
    description: "Make and use organic pest repellents.",
    category: "Pest Control",
  },
  {
    title: "Drip Irrigation Systems",
    video: "https://www.youtube.com/embed/05ITJlgPcR0?si=PYp_MhMSSKnyGRM3",
    description: "Introduction to efficient drip irrigation setup.",
    category: "Irrigation",
  },
  {
    title: "Micronutrient Fertilization",
    video: "https://www.youtube.com/embed/Ua3rEqUe_EQ?si=hiW0FxLdnsQbmx3a",
    description: "Understanding the role of micronutrients in farming.",
    category: "Fertilization",
  },
  {
    title: "Tractor Safety Tips",
    video: "https://www.youtube.com/embed/A8qTRBc8Bws?si=OLpEsGWbQQtL2zBO",
    description: "Operate tractors safely and effectively.",
    category: "Equipment",
  },
  {
    title: "Composting for Healthy Soil",
    video: "https://www.youtube.com/embed/8ulpy_GFLDk?si=RJZWYX02wjgOymNc",
    description: "How to create nutrient-rich compost for your farm.",
    category: "Soil Health",
  },
  {
    title: "Biological Pest Control",
    video: "https://www.youtube.com/embed/wRrWDPiV2Cc?si=VmgYvjPRwWnCdMqo",
    description: "Use natural predators to manage pests.",
    category: "Pest Control",
  },
  {
    title: "Rainwater Harvesting for Farms",
    video: "https://www.youtube.com/embed/V2tQv5xi5t8?si=7y0X48g2IaSkDZQS",
    description: "Store rainwater for agricultural use efficiently.",
    category: "Irrigation",
  },
  {
    title: "Organic Fertilizer Preparation",
    video: "https://www.youtube.com/embed/jJkssgc4wqc?si=cFBoOlwI__LkWP3S",
    description: "Make organic fertilizers at home.",
    category: "Fertilization",
  },
  {
    title: "Small Farm Equipment Guide",
    video: "https://www.youtube.com/embed/5RQU2V1CCAk?si=fvJ1kd5VEr6TulYq",
    description: "Choosing the right small equipment for your farm.",
    category: "Equipment",
  },
];


export default function Tutorials({ login }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  if (!login) {
    return <h1>404 Not Found!!</h1>;
  }

  const filteredTutorials = tutorialsList.filter((tutorial) => {
    const matchesCategory =
      !selectedCategory || tutorial.category === selectedCategory;
    const matchesSearch =
      tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleCategoryClick = (category) => {
    setSelectedCategory((prev) => (prev === category ? "" : category)); // toggle
  };

  return (
    <div className="container">
      <div className="header">
        <h2>Farmers' Learning Hub</h2>
        <input
          type="text"
          className="tutorial-search-bar"
          placeholder="Search tutorials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="categories">
        {["Soil Health", "Pest Control", "Irrigation", "Fertilization", "Equipment"].map(
          (category, index) => (
            <div
              key={index}
              className={`category ${
                selectedCategory === category ? "active-category" : ""
              }`}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </div>
          )
        )}
      </div>

      <div className="video-container">
        {filteredTutorials.length > 0 ? (
          filteredTutorials.map((tutorial, index) => (
            <div key={index} className="tutorial-content">
              <h2 className="tutorial-title">{tutorial.title}</h2>
              <div className="video-wrapper">
                <iframe
                  className="tutorial-video"
                  src={tutorial.video}
                  title={tutorial.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <p>{tutorial.description}</p>
            </div>
          ))
        ) : (
          <p style={{ textAlign: "center", marginTop: "2rem" }}>
            No tutorials found.
          </p>
        )}
      </div>

      <div className="footer">&copy; 2025 Smart Farming Solutions</div>
    </div>
  );
}
