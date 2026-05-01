# Wheel of Fortune Game

A modern, interactive spinning wheel game built with React. Features an admin panel for inventory management and spin approval system.

## Features

### 🎯 Spinning Wheel
- Beautiful, animated spinning wheel with smooth physics
- Dynamic segments based on available prizes
- Responsive design that works on all devices
- Visual feedback and celebration animations

### 📦 Inventory Management
- Add, edit, and delete prizes
- Set quantity and probability weights
- Real-time stock tracking
- Visual inventory status

### ✅ Admin Approval System
- View pending spin requests
- Approve or reject prize claims
- Automatic inventory deduction on approval
- Request history tracking

### 💾 Data Persistence
- Local storage for inventory and requests
- No backend required - fully client-side
- Data persists between sessions

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone or download the project
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

### For Players
1. Visit the main page to see the spinning wheel
2. Click "SPIN" or the "Spin the Wheel!" button
3. Watch the wheel spin and see your prize
4. Wait for admin approval of your prize

### For Administrators
1. Navigate to the Admin page
2. Manage inventory by adding/editing/deleting prizes
3. Review pending spin requests
4. Approve or reject prize claims
5. Monitor processed requests history

## Default Prizes

The game comes pre-loaded with 20 sample prizes:
- High-value items (iPhone, AirPods, Smart Watch)
- Mid-value items (Gift cards, accessories)
- Low-value items (Merchandise, office supplies)

Each prize has:
- **Name**: Display name on the wheel
- **Quantity**: Available stock
- **Probability**: Weight for winning chance
- **Emoji**: Visual representation

## Customization

### Adding New Prizes
1. Go to Admin page
2. Click "Add New Prize"
3. Fill in the prize details
4. Save to add to inventory

### Modifying Probability
- Higher probability = higher chance of winning
- Recommended range: 5-50
- Balance prizes for fair gameplay

### Styling
The application uses:
- Modern CSS with gradients and animations
- Responsive design principles
- Lucide React icons
- Custom color schemes

## Technical Details

### Architecture
- **Frontend**: React 18 with functional components
- **Routing**: React Router DOM
- **Styling**: CSS with modern features
- **Icons**: Lucide React
- **Storage**: Browser localStorage

### Key Components
- `App.js`: Main application with routing
- `WheelPage.js`: Spinning wheel interface
- `AdminPage.js`: Admin dashboard
- Local storage for data persistence

### Wheel Mechanics
- Weighted random selection based on probability
- Smooth CSS animations with cubic-bezier easing
- Dynamic segment generation
- Visual pointer and center button

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License
This project is open source and available under the MIT License.

## Contributing
Feel free to submit issues and enhancement requests!
