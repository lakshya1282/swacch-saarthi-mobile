import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const TrainingScreen = () => {
  const [currentModule, setCurrentModule] = useState(0);
  const [completedModules, setCompletedModules] = useState([]);

  const modules = [
    {
      id: 1,
      title: 'Waste Segregation Basics',
      description: 'Learn the fundamentals of waste segregation',
      content: 'Waste segregation at source is the most important step in waste management...',
      quiz: {
        question: 'Which bin should kitchen vegetable peels go into?',
        options: ['Blue bin (Dry)', 'Green bin (Wet)', 'Red bin (Hazardous)', 'Any bin'],
        correctAnswer: 1
      }
    },
    {
      id: 2,
      title: 'Dry Waste Management',
      description: 'Learn about recyclable dry waste',
      content: 'Dry waste includes paper, plastic, metal, glass...',
      quiz: {
        question: 'Which of these should NOT go in dry waste?',
        options: ['Plastic bottle', 'Banana peel', 'Newspaper', 'Glass jar'],
        correctAnswer: 1
      }
    },
    {
      id: 3,
      title: 'Wet Waste and Composting',
      description: 'Learn about organic waste and home composting',
      content: 'Wet waste includes all biodegradable organic matter...',
      quiz: {
        question: 'How much household waste can home composting reduce?',
        options: ['10-20%', '30-40%', '50-60%', '70-80%'],
        correctAnswer: 1
      }
    }
  ];

  const completeModule = (moduleId) => {
    if (!completedModules.includes(moduleId)) {
      setCompletedModules([...completedModules, moduleId]);
    }
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>Waste Management Training</h1>
          <p>Interactive learning modules on waste management</p>
        </div>
      </div>

      <nav className="navigation">
        <div className="container">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/training">Training</Link></li>
            <li><Link to="/schedule">Schedule Pickup</Link></li>
          </ul>
        </div>
      </nav>

      <div className="container">
        <div className="card">
          <h3>Training Progress</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{width: `${(completedModules.length / modules.length) * 100}%`}}
            ></div>
          </div>
          <p>{completedModules.length} of {modules.length} modules completed</p>
        </div>

        <div className="grid">
          {modules.map((module, index) => (
            <div key={module.id} className="card">
              <h3>
                {completedModules.includes(module.id) && <span className="badge">✓ Completed</span>}
                Module {module.id}: {module.title}
              </h3>
              <p>{module.description}</p>
              <div style={{marginTop: '20px'}}>
                <h4>Sample Content:</h4>
                <p style={{fontStyle: 'italic', color: '#666'}}>{module.content}</p>
              </div>
              <div style={{marginTop: '20px'}}>
                <h4>Quiz Preview:</h4>
                <p><strong>{module.quiz.question}</strong></p>
                <ul style={{margin: '10px 0', paddingLeft: '20px'}}>
                  {module.quiz.options.map((option, idx) => (
                    <li key={idx} style={{margin: '5px 0'}}>{option}</li>
                  ))}
                </ul>
              </div>
              <button 
                className={completedModules.includes(module.id) ? "button button-secondary" : "button"}
                onClick={() => completeModule(module.id)}
                disabled={completedModules.includes(module.id)}
              >
                {completedModules.includes(module.id) ? 'Completed' : 'Start Module'}
              </button>
            </div>
          ))}
        </div>

        {completedModules.length === modules.length && (
          <div className="success-message" style={{textAlign: 'center'}}>
            <h3>🎉 Congratulations!</h3>
            <p>You have completed all training modules. You're now ready to start scheduling waste pickups!</p>
            <Link to="/schedule" className="button">Schedule Your First Pickup</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingScreen;
