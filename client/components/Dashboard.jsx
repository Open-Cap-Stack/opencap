import React from 'react';
import styled from 'styled-components';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

const DashboardContainer = styled.div`
  display: flex;
  width: 1228px;
  height: 768px;
`;

const Dashboard: React.FC = () => {
  return (
    <DashboardContainer>
      <Sidebar />
      <MainContent />
    </DashboardContainer>
  );
};

export default Dashboard;