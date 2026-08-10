import styled from 'styled-components';
import SUMUNG_CUT from '../../assets/sumung_cut.png';

const NavbarBG = styled.div`
  width: 100%;
  height: 50px;
  background-color: #0E207F;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const MascotImg = styled.img.attrs({
  src: SUMUNG_CUT
})`
  height: 100%;
  aspect-ratio: 1;
  object-fit: contain;
`;

const Title = styled.div`
  margin-left: 0.5em;
  color: white;
  font-weight: 600;
  font-size: 1.2em;
`;

const Navbar = () => {
  return (
    <NavbarBG>
      <MascotImg/>
      <Title>상명대학교 서버상태</Title>
    </NavbarBG>
  );
}

export default Navbar;