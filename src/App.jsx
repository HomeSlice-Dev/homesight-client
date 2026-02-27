import { useState } from 'react';
import Home from './Home';
import HomesliceReport from './HomesliceReport';

function App() {
  const [reportData, setReportData] = useState(null);

  if (reportData) {
    return <HomesliceReport data={reportData} onBack={() => setReportData(null)} />;
  }
  return <Home onFetchSuccess={setReportData} />;
}

export default App;
