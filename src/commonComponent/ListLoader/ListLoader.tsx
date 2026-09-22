import "./ListLoader.scss";

const ListLoader = () => {
  return (
    <div className="loading-container">
      <div className="lds-ripple">
        <div />
        <div />
      </div>
    </div>
  );
};

export default ListLoader;