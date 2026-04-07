from distributed_gateway import DistributedGateway, VectorClock
from api_gateway.distributed_gateway import DistributedGateway as ImplDistributedGateway
from api_gateway.distributed_gateway import VectorClock as ImplVectorClock


def test_import_shim_exports_gateway_class():
    assert DistributedGateway is ImplDistributedGateway


def test_import_shim_exports_vector_clock_class():
    vc = VectorClock({"node": 1})
    assert isinstance(vc, ImplVectorClock)
    assert vc.to_dict() == {"node": 1}
